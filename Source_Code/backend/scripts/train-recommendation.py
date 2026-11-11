"""Reproducible temporal evaluation on an anonymized Zenodo feed subset.

Outputs offline artifacts, not social accounts or posts in the application DB.
The experiment trains the author-affinity component of the live hybrid ranker;
it does not evaluate its content, follow, view, comment or save components.
"""
import argparse, csv, gzip, hashlib, io, json, math, random, tarfile
from collections import Counter, defaultdict
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--archive',required=True)
parser.add_argument('--output',required=True)
parser.add_argument('--feed',default='Science')
parser.add_argument('--max-users',type=int,default=2000)
args=parser.parse_args()
archive=Path(args.archive)
if hashlib.md5(archive.read_bytes()).hexdigest()!='499b99ae97e284240285f0d26e30d8cf':
    raise ValueError('Zenodo archive checksum mismatch')
rows=[]
with tarfile.open(archive,'r:gz') as tar:
    member=tar.getmember('feed_posts_likes/'+args.feed+'.csv.gz')
    with gzip.GzipFile(fileobj=tar.extractfile(member)) as stream:
        for row in csv.reader(io.TextIOWrapper(stream,encoding='utf8')):
            if len(row)!=4: continue
            user,author,post,timestamp=row
            if not all(v.isdigit() for v in row): continue
            rows.append((timestamp,user,author,author+':'+post))
rows=sorted(set(rows))
cut1=rows[int(len(rows)*.70)][0]
cut2=rows[int(len(rows)*.85)][0]
train=[r for r in rows if r[0]<cut1]
validation=[r for r in rows if cut1<=r[0]<cut2]
test=[r for r in rows if r[0]>=cut2]
print('Rows:',len(rows),'train:',len(train),'validation:',len(validation),'test:',len(test),flush=True)
popularity=Counter(r[3] for r in train)
authors={r[3]:r[2] for r in train}
affinity=defaultdict(Counter)
seen=defaultdict(set)
for _,user,author,item in train:
    affinity[user][author]+=1
    seen[user].add(item)
catalog=sorted(popularity)

def cases(split):
    positives=defaultdict(list)
    for timestamp,user,author,item in split:
        if user in affinity and len(seen[user])>=5 and item in popularity and item not in seen[user]:
            positives[user].append((timestamp,item))
    result=[]
    rng=random.Random(42)
    for user in sorted(positives)[:args.max_users]:
        # First eligible future positive; all known positives excluded from negatives.
        target=min(positives[user])[1]
        excluded=seen[user]|{p[1] for p in positives[user]}
        negatives=[i for i in catalog if i not in excluded]
        if len(negatives)<99: continue
        candidate=rng.sample(negatives,99)+[target]
        result.append((user,target,candidate))
    return result

val_cases,test_cases=cases(validation),cases(test)
if not val_cases or not test_cases:
    raise ValueError('Not enough eligible interactions for temporal evaluation')

def evaluate(alpha,cases):
    hits,ndcg=0,0
    for user,target,candidate in cases:
        ranked=sorted(candidate,key=lambda item:(-(.3*math.log1p(popularity[item])+alpha*math.log1p(affinity[user][authors[item]])),item))
        rank=ranked.index(target)+1
        if rank<=10:
            hits+=1
            ndcg+=1/math.log2(rank+1)
    count=len(cases)
    return {'users':count,'sampled_hit_rate_at_10':hits/count,'sampled_recall_at_10':hits/count,'sampled_precision_at_10':hits/(10*count),'sampled_ndcg_at_10':ndcg/count}

grid=[{'author_affinity_weight':alpha,'metrics':evaluate(alpha,val_cases)} for alpha in [0,.25,.5,1,2,4]]
selected=max(grid,key=lambda r:(r['metrics']['sampled_ndcg_at_10'],-r['author_affinity_weight']))
report={
 'source':'https://zenodo.org/records/14669616',
 'archive_md5':'499b99ae97e284240285f0d26e30d8cf',
 'feed':args.feed,'seed':42,'rows':len(rows),
 'split':{'method':'global chronological 70/15/15; equal timestamps kept in the same partition','validation_from':cut1,'test_from':cut2,'train':len(train),'validation':len(validation),'test':len(test)},
 'protocol':'100 sampled candidates per user: one eligible future positive and 99 uniform negatives from training catalog; training likes excluded. Warm users with >=5 distinct training likes; maximum 2000 users. Test held untouched during hyperparameter selection.',
 'validation_grid':grid,'selected_author_affinity_weight':selected['author_affinity_weight'],
 'test_popularity_baseline':evaluate(0,test_cases),
 'test_selected_model':evaluate(selected['author_affinity_weight'],test_cases),
 'limitations':['One Science feed only, anonymized likes only.','Sampled metrics do not equal full-catalog metrics.','Cold-start users/items excluded from this evaluation.','Only the author-affinity component is evaluated; no evidence yet for the complete live hybrid ranker.','No external identities are imported into the live app.']
}
out=Path(args.output)
out.mkdir(parents=True,exist_ok=True)
(out/'evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
(out/'weights.json').write_text(json.dumps({'version':'zenodo-science-author-v1','authorAffinityWeight':selected['author_affinity_weight'],'popularityWeight':.3,'source':report['source'],'evaluationProtocol':report['protocol']},indent=2),encoding='utf8')
print(json.dumps({'selected_weight':report['selected_author_affinity_weight'],'baseline':report['test_popularity_baseline'],'selected':report['test_selected_model']},indent=2),flush=True)
