"""Directed follow recommendations with disk-backed graph and held-out edge evaluation."""
import argparse
from collections import Counter
import csv
import gzip
import hashlib
import json
from pathlib import Path
import sqlite3
import urllib.request

from recommender import ROOT, md5, write_json, positive, nonnegative, safe_name

CHECKSUM = '33eb37998142681ab0a993765c18b5cb'


def split_edge(source, target, seed):
    value = int.from_bytes(hashlib.sha256(f'{seed}:{source}:{target}'.encode()).digest()[:8], 'big') % 100
    return 'train' if value < 80 else ('validation' if value < 90 else 'test')


def build(args):
    folder = ROOT / 'artifacts' / args.run
    if folder.exists():
        raise ValueError('Run exists; choose another --run')
    path = ROOT / 'data/raw/followers.csv.gz'
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or md5(path) != CHECKSUM:
        temp = path.with_suffix('.gz.part')
        with urllib.request.urlopen('https://zenodo.org/records/14669616/files/followers.csv.gz?download=1', timeout=120) as response, temp.open('wb') as out:
            while chunk := response.read(1024*1024):
                out.write(chunk)
        if md5(temp) != CHECKSUM:
            raise ValueError('Invalid followers checksum')
        temp.replace(path)
    folder.mkdir(parents=True)
    db = sqlite3.connect(folder / 'graph.sqlite')
    db.execute('CREATE TABLE edges (source TEXT, target TEXT, split TEXT, PRIMARY KEY(source,target)) WITHOUT ROWID')
    count = 0
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        batch = []
        for row in csv.reader(stream):
            if len(row) != 2 or not all(x.isdigit() for x in row):
                raise ValueError(f'Invalid edge: {row}')
            source, target = row
            if source == target:
                continue
            batch.append((source,target,split_edge(source,target,args.seed)))
            count += 1
            if args.max_edges and count >= args.max_edges:
                break
            if len(batch) == 50000:
                db.executemany('INSERT OR IGNORE INTO edges VALUES (?,?,?)',batch)
                db.commit()
                batch.clear()
                print(f'Read {count:,} edges', flush=True)
        db.executemany('INSERT OR IGNORE INTO edges VALUES (?,?,?)',batch)
    db.execute('CREATE INDEX split_source ON edges(split,source)')
    db.execute("CREATE TABLE popularity AS SELECT target, COUNT(*) AS score FROM edges WHERE split='train' GROUP BY target")
    db.execute('CREATE INDEX popularity_score ON popularity(score DESC,target)')
    db.commit()
    report = {'seed':args.seed,'protocol':'deterministic edge holdout, not temporal prediction',
              'source_md5': CHECKSUM, 'input_edges_read':count, 'max_edges':args.max_edges,
              'sample_note':'prefix sample, not representative' if args.max_edges else 'all input edges', 'counts':dict(db.execute('SELECT split,COUNT(*) FROM edges GROUP BY split'))}
    write_json(folder/'follow_report.json',report)
    db.close()
    print(json.dumps(report,indent=2))


def rank(db, user, k, method='twohop'):
    seen = {r[0] for r in db.execute("SELECT target FROM edges WHERE source=? AND split='train'",(user,))}
    blocked = seen | {user}
    scores = Counter()
    if method == 'twohop':
        for middle in sorted(seen):
            for (target,) in db.execute("SELECT target FROM edges WHERE source=? AND split='train'",(middle,)):
                if target not in blocked:
                    scores[target] += 1
    result = sorted(scores, key=lambda t:(-scores[t],t))[:k]
    # Fill short lists with train popularity; baseline uses the same exclusions.
    if len(result) < k:
        for target, score in db.execute('SELECT target,score FROM popularity ORDER BY score DESC,target'):
            if target not in blocked and target not in result:
                result.append(target)
                if len(result) == k:
                    break
    return result


def metrics(predictions, targets, k):
    import math
    hits = [int(p in targets) for p in predictions]
    recall = sum(hits)/len(targets)
    ideal = sum(1/math.log2(i+2) for i in range(min(k,len(targets))))
    return recall, sum(v/math.log2(i+2) for i,v in enumerate(hits))/ideal


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('build')
    p.add_argument('--run',type=safe_name,default='follow-v1')
    p.add_argument('--seed',type=int,default=42)
    p.add_argument('--max-edges',type=nonnegative,default=0)
    for command in ['recommend','evaluate']:
        p=sub.add_parser(command)
        p.add_argument('--run',type=safe_name,default='follow-v1')
        p.add_argument('--k',type=positive,default=10)
        if command=='recommend':
            p.add_argument('--user',required=True)
        else:
            p.add_argument('--split',choices=['validation','test'],default='validation')
            p.add_argument('--max-users',type=positive,default=100)
    args=parser.parse_args()
    if args.command=='build':
        build(args)
        return
    folder=ROOT/'artifacts'/args.run
    if not (folder/'follow_report.json').exists():
        raise ValueError('Graph build missing or incomplete')
    db=sqlite3.connect((folder/'graph.sqlite').resolve().as_uri()+'?mode=ro',uri=True)
    if args.command=='recommend':
        result={'user_id':args.user,'method':'directed_twohop_then_train_popularity',
                'user_ids':rank(db,args.user,args.k)}
        write_json(folder/'follow_recommendations.json',result)
    else:
        # Hash-selected users, independent of graph iteration order, bounded memory.
        import heapq
        cursor=db.execute('SELECT DISTINCT source FROM edges WHERE split=?',(args.split,))
        users=heapq.nsmallest(args.max_users,(r[0] for r in cursor),key=lambda u:hashlib.sha256(u.encode()).digest())
        totals={'twohop':[],'popularity':[]}
        cold=0
        for user in users:
            if not db.execute("SELECT 1 FROM edges WHERE source=? AND split='train' LIMIT 1",(user,)).fetchone():
                cold+=1
            target={r[0] for r in db.execute('SELECT target FROM edges WHERE source=? AND split=?',(user,args.split))}
            for method in totals:
                totals[method].append(metrics(rank(db,user,args.k,method),target,args.k))
        if not users:
            raise ValueError('Empty evaluation split')
        result={'split':args.split,'k':args.k,'evaluated_users':len(users),'max_users':args.max_users,
                'cold_source_users':cold,'protocol':'edge holdout, includes cold targets; full train-target popularity catalog; twohop candidates plus fallback',
                'metrics':{m:{f'Recall@{args.k}':sum(x[0] for x in v)/len(v),f'NDCG@{args.k}':sum(x[1] for x in v)/len(v)} for m,v in totals.items()}}
        write_json(folder/f'follow_{args.split}_metrics.json',result)
    print(json.dumps(result,indent=2))
    db.close()


if __name__=='__main__':
    main()
