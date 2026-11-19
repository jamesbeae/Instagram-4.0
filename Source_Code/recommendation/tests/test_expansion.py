import csv
import gzip
import io
import json
from pathlib import Path
import sqlite3
import sys
import tarfile
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
import recommender as rec
import follow_recommender as follow
from follow_recommender import rank, split_edge


class ExpansionTests(unittest.TestCase):
    def test_directed_twohop_filters_self_seen_and_holdout(self):
        db=sqlite3.connect(':memory:')
        db.execute('CREATE TABLE edges(source TEXT,target TEXT,split TEXT)')
        db.executemany('INSERT INTO edges VALUES (?,?,?)',[
            ('A','B','train'),('A','C','train'),('B','D','train'),
            ('C','D','train'),('B','E','train'),('B','A','train'),
            ('C','X','test'),('Q','Z','train')])
        db.execute("CREATE TABLE popularity AS SELECT target,COUNT(*) score FROM edges WHERE split='train' GROUP BY target")
        result=rank(db,'A',3)
        self.assertEqual(result[:2],['D','E'])
        self.assertNotIn('A',result)
        self.assertNotIn('B',result)
        self.assertNotIn('C',result)
        self.assertNotIn('X',result)
        self.assertEqual(rank(db,'unknown',1,'popularity'),['D'])
        db.close()

    def test_follow_build_evaluate_recommend_end_to_end(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            raw=root/'data/raw'
            raw.mkdir(parents=True)
            source=raw/'followers.csv.gz'
            with gzip.open(source,'wt',encoding='utf-8') as stream:
                for u in range(12):
                    for v in range(12):
                        stream.write(f'{u},{v}\n')
                stream.write('0,1\n')
            args=SimpleNamespace(run='fixture',seed=42,max_edges=0)
            with patch.object(follow,'ROOT',root),patch.object(follow,'CHECKSUM',rec.md5(source)):
                follow.build(args)
                for command in [
                    ['recommend','--run','fixture','--user','0','--k','5'],
                    ['evaluate','--run','fixture','--split','validation','--max-users','10']]:
                    with patch.object(sys,'argv',['follow_recommender.py']+command):
                        follow.main()
            folder=root/'artifacts/fixture'
            report=rec.read_json(folder/'follow_report.json')
            self.assertEqual(sum(report['counts'].values()),132)
            result=rec.read_json(folder/'follow_validation_metrics.json')
            self.assertGreater(result['evaluated_users'],0)
            for values in result['metrics'].values():
                self.assertTrue(all(0 <= v <= 1 for v in values.values()))
            db=sqlite3.connect(folder/'graph.sqlite')
            expected=db.execute("SELECT COUNT(*) FROM edges WHERE split='train'").fetchone()[0]
            self.assertEqual(expected,db.execute('SELECT SUM(score) FROM popularity').fetchone()[0])
            db.close()

    def test_als_train_reload_evaluate_and_recommend(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            data=root/'data/processed/fixture'
            data.mkdir(parents=True)
            rec.write_csv(data/'train.csv',[('a','1',1),('a','2',2),('b','2',1),('b','3',2)])
            rec.write_csv(data/'validation.csv',[('a','3',3),('b','1',3)])
            rec.write_json(data/'posts.json',{p:{'post_id':p,'text':p,'date':1} for p in ['1','2','3']})
            with patch.object(rec,'ROOT',root):
                rec.train(SimpleNamespace(data='fixture',run='fixture',factors=2,iterations=3,
                    alpha=1,regularization=1,seed=42))
                rec.evaluate(SimpleNamespace(run='fixture',split='validation',k=10,
                    seed=42,max_eval_users=0))
                rec.recommend(SimpleNamespace(run='fixture',user='a',k=10))
                result=rec.read_json(root/'artifacts/fixture/recommendations.json')
                self.assertEqual([p['post_id'] for p in result['recommendations']],['3'])
                report=rec.read_json(root/'artifacts/fixture/validation_metrics.json')
                self.assertEqual(report['metrics']['als']['Recall@10'],1)
                self.assertEqual(report['warm_target_coverage'],1)
                rec.recommend(SimpleNamespace(run='fixture',user='unknown',k=2))
                result=rec.read_json(root/'artifacts/fixture/recommendations.json')
                self.assertEqual(result['method'],'popularity_fallback')

    def test_split_is_stable_and_directed(self):
        self.assertEqual(split_edge('123','456',42),split_edge('123','456',42))
        counts={name:0 for name in ['train','validation','test']}
        for i in range(1000):
            counts[split_edge(str(i),'target',42)]+=1
        self.assertGreater(counts['train'],700)
        self.assertGreater(counts['validation'],50)
        self.assertGreater(counts['test'],50)

    def test_all_feed_prepare_deduplicates_pairs_and_retains_earliest(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            raw=root/'data/raw'
            raw.mkdir(parents=True)
            posts=[{'post_id':1,'user_id':9,'date':202301010000,'text':'one'}]
            def archive(name,members):
                with tarfile.open(raw/name,'w:gz') as tar:
                    for member,text in members.items():
                        content=gzip.compress(text.encode())
                        info=tarfile.TarInfo(member)
                        info.size=len(content)
                        tar.addfile(info,io.BytesIO(content))
            post_text=''.join(json.dumps(p)+'\n' for p in posts)
            archive('feed_posts.tar.gz',{'feed_posts/A.jsonl.gz':post_text,'feed_posts/B.jsonl.gz':post_text})
            lines=''.join(f'{i},9,1,{202301020000+i}\n' for i in range(30))
            archive('feed_posts_likes.tar.gz',{'feed_posts_likes/A.csv.gz':lines,
                    'feed_posts_likes/B.csv.gz':'0,9,1,202301030000\n'})
            checks={p.name:rec.md5(p) for p in raw.iterdir()}
            args=SimpleNamespace(feed='all',name='fixture',min_user_likes=1,
                min_post_likes=1,max_users=0,seed=42,func=rec.prepare)
            with patch.object(rec,'ROOT',root),patch.object(rec,'CHECKSUMS',checks):
                rec.prepare(args)
            out=root/'data/processed/fixture'
            report=rec.read_json(out/'prepare_report.json')
            self.assertEqual(report['feed_count'],2)
            self.assertEqual(report['duplicate_like_rows'],1)
            self.assertEqual(report['unique_matched_likes'],30)
            rows=rec.read_csv(out/'train.csv')
            self.assertIn(('0','1',202301020000),rows)
            self.assertEqual(rec.read_json(out/'posts.json')['1']['feeds'],['A','B'])


if __name__=='__main__':
    unittest.main()
