"""Train a small, inspectable implicit-feedback ALS model on real Bluesky likes."""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import tarfile
import time
import urllib.request

import numpy as np
from threadpoolctl import threadpool_limits

ROOT = Path(__file__).resolve().parents[1]
CHECKSUMS = {
    "feed_posts.tar.gz": "96f666138008f116d8c4bb8ef8d68942",
    "feed_posts_likes.tar.gz": "499b99ae97e284240285f0d26e30d8cf",
}


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def md5(path):
    digest = hashlib.md5()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(args):
    folder = ROOT / "data/raw"
    folder.mkdir(parents=True, exist_ok=True)
    for name, checksum in CHECKSUMS.items():
        dest = folder / name
        if dest.exists() and md5(dest) == checksum:
            print(f"OK: {name}")
            continue
        temp = dest.with_suffix(dest.suffix + ".part")
        url = f"https://zenodo.org/records/14669616/files/{name}?download=1"
        print(f"Downloading {url}", flush=True)
        with urllib.request.urlopen(url, timeout=120) as response, temp.open("wb") as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
        if md5(temp) != checksum:
            raise ValueError(f"Checksum mismatch: {temp}; rerun download")
        temp.replace(dest)
        print(f"Saved {dest}", flush=True)


def archive_lines(path, member):
    # Read nested gzip members directly. Never extract untrusted archive paths.
    with tarfile.open(path, "r:gz") as archive:
        entry = archive.getmember(member)
        raw = archive.extractfile(entry)
        if raw is None:
            raise ValueError(f"Not a regular file: {member}")
        with raw, gzip.GzipFile(fileobj=raw) as compressed:
            with io.TextIOWrapper(compressed, encoding="utf-8") as text:
                yield from text


def stable_order(values, seed):
    return sorted(values, key=lambda value: hashlib.sha256(
        f"{seed}:{value}".encode()).hexdigest())


def temporal_split(rows):
    dates = sorted({r[2] for r in rows})
    if len(dates) < 3:
        raise ValueError("Need at least 3 distinct timestamps")
    # Quantile cutoffs on events, followed by strict time boundaries (ties stay together).
    event_dates = sorted(r[2] for r in rows)
    first = event_dates[int(len(rows) * 0.8)]
    second = event_dates[int(len(rows) * 0.9)]
    if first >= second:
        raise ValueError("Time cutoffs coincide; choose data with a longer time range")
    parts = [[r for r in rows if r[2] < first],
             [r for r in rows if first <= r[2] < second],
             [r for r in rows if r[2] >= second]]
    if not all(parts):
        raise ValueError("One temporal split is empty")
    return parts, first, second


def prune_train(rows, min_user, min_post, max_users, seed):
    counts = {}
    for user, _, _ in rows:
        counts[user] = counts.get(user, 0) + 1
    eligible = stable_order([u for u, c in counts.items() if c >= min_user], seed)
    if max_users:
        eligible = eligible[:max_users]
    users = set(eligible)
    rows = [r for r in rows if r[0] in users]
    # Iterative core filtering uses train only, never validation or test activity.
    while rows:
        uc, pc = {}, {}
        for user, post, _ in rows:
            uc[user] = uc.get(user, 0) + 1
            pc[post] = pc.get(post, 0) + 1
        filtered = [r for r in rows if uc[r[0]] >= min_user and pc[r[1]] >= min_post]
        if len(filtered) == len(rows):
            return rows
        rows = filtered
    raise ValueError("Train empty after filtering; lower --min-user-likes/--min-post-likes")


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(["user_id", "post_id", "timestamp"])
        writer.writerows(rows)


def read_csv(path):
    with path.open(encoding="utf-8", newline="") as stream:
        return [(r["user_id"], r["post_id"], int(r["timestamp"]))
                for r in csv.DictReader(stream)]


def prepare(args):
    raw = ROOT / "data/raw"
    for name, checksum in CHECKSUMS.items():
        if md5(raw / name) != checksum:
            raise ValueError(f"Bad checksum: {name}; rerun download")
    feeds = [args.feed]
    if args.feed == "all":
        with tarfile.open(raw / "feed_posts.tar.gz") as archive:
            feeds = sorted(Path(m.name).name.removesuffix(".jsonl.gz")
                           for m in archive if m.isfile() and m.name.endswith(".jsonl.gz"))
    posts = {}
    for feed in feeds:
        for line in archive_lines(raw / "feed_posts.tar.gz", f"feed_posts/{feed}.jsonl.gz"):
            post = json.loads(line)
            key = str(post["post_id"])
            if key in posts:
                posts[key]["feeds"].append(feed)
                continue
            posts[key] = {
                "post_id": key, "author_id": str(post["user_id"]),
                "date": int(post["date"]), "text": post.get("text", ""),
                "feed": feed, "feeds": [feed],
            }
    pairs = {}
    missing, invalid, valid_rows = 0, 0, 0
    for feed in feeds:
        print(f"Reading likes: {feed}", flush=True)
        lines = archive_lines(raw / "feed_posts_likes.tar.gz",
                              f"feed_posts_likes/{feed}.csv.gz")
        for row in csv.reader(lines):
            if len(row) != 4:
                raise ValueError(f"Expected 4 columns, got {row}")
            user, author, post, timestamp = row
            if post not in posts:
                missing += 1
                continue
            date = int(timestamp)
            if posts[post]["author_id"] != author or date < posts[post]["date"]:
                invalid += 1
                continue
            valid_rows += 1
            key = (user, post)
            pairs[key] = min(date, pairs.get(key, date))
    rows = sorted([(u, p, t) for (u, p), t in pairs.items()], key=lambda r: (r[2], r[0], r[1]))
    parts, first, second = temporal_split(rows)
    train = prune_train(parts[0], args.min_user_likes, args.min_post_likes,
                        args.max_users, args.seed)
    out = ROOT / "data/processed" / args.name
    if out.exists():
        raise ValueError(f"Output exists: {out}; choose a new --name")
    out.mkdir(parents=True)
    for label, data in zip(["train", "validation", "test"], [train, parts[1], parts[2]]):
        write_csv(out / f"{label}.csv", data)
    write_json(out / "posts.json", posts)
    stats = {
        "source": "https://zenodo.org/records/14669616", "feed": args.feed,
        "timestamp_format": "YYYYMMDDHHMM (source calendar minute; not Unix seconds)",
        "validation_start": first, "test_start": second,
        "feeds": feeds, "feed_count": len(feeds),
        "duplicate_like_rows": valid_rows - len(rows),
        "unique_matched_likes": len(rows), "missing_post_rows": missing,
        "invalid_author_or_date_rows": invalid,
        "train_before_filtering": len(parts[0]), "train_rows": len(train),
        "validation_rows": len(parts[1]), "test_rows": len(parts[2]),
        "train_users": len({r[0] for r in train}), "train_posts": len({r[1] for r in train}),
        "selection": vars(args) | {"func": args.func.__name__},
    }
    write_json(out / "prepare_report.json", stats)
    print(json.dumps(stats, indent=2))


def neighborhoods(rows, users, posts):
    umap, pmap = {u: i for i, u in enumerate(users)}, {p: i for i, p in enumerate(posts)}
    by_user, by_post = [set() for _ in users], [set() for _ in posts]
    for u, p, _ in rows:
        by_user[umap[u]].add(pmap[p])
        by_post[pmap[p]].add(umap[u])
    return ([np.array(sorted(x), dtype=np.int64) for x in by_user],
            [np.array(sorted(x), dtype=np.int64) for x in by_post])


def als_update(other, groups, alpha, regularization):
    gram = other.T @ other
    base = gram + regularization * np.eye(other.shape[1])
    result = np.zeros((len(groups), other.shape[1]))
    for index, ids in enumerate(groups):
        if len(ids):
            liked = other[ids]
            a = base + alpha * (liked.T @ liked)
            b = (1 + alpha) * liked.sum(axis=0)
            result[index] = np.linalg.solve(a, b)
    return result


def objective(x, y, groups, alpha, regularization):
    # Sum squared predictions over ALL pairs without allocating a dense user-item matrix.
    value = float(np.sum((x.T @ x) * (y.T @ y)))
    for user, ids in enumerate(groups):
        pred = y[ids] @ x[user]
        value += float(np.sum(alpha * pred**2 - 2 * (1 + alpha) * pred + (1 + alpha)))
    return value + regularization * float(np.sum(x**2) + np.sum(y**2))


def train(args):
    processed = ROOT / "data/processed" / args.data
    rows = read_csv(processed / "train.csv")
    users, posts = sorted({r[0] for r in rows}), sorted({r[1] for r in rows})
    if not users or len(posts) < 2:
        raise ValueError("Train needs users and at least 2 posts")
    output = ROOT / "artifacts" / args.run
    if output.exists():
        raise ValueError(f"Run exists: {output}; choose a new --run")
    output.mkdir(parents=True)
    by_user, by_post = neighborhoods(rows, users, posts)
    rng = np.random.default_rng(args.seed)
    x = rng.normal(0, 0.01, (len(users), args.factors))
    y = rng.normal(0, 0.01, (len(posts), args.factors))
    started = time.perf_counter()
    history = []
    with threadpool_limits(limits=1):
        for epoch in range(args.iterations):
            x = als_update(y, by_user, args.alpha, args.regularization)
            y = als_update(x, by_post, args.alpha, args.regularization)
            loss = objective(x, y, by_user, args.alpha, args.regularization)
            history.append({"iteration": epoch + 1, "objective": loss})
            print(f"iteration {epoch+1}/{args.iterations}: objective={loss:.4f}", flush=True)
    np.savez_compressed(output / "model.npz", user_factors=x, item_factors=y)
    write_json(output / "id_mapping.json", {"user_ids": users, "post_ids": posts})
    write_csv(output / "train.csv", rows)
    all_posts = read_json(processed / "posts.json")
    write_json(output / "posts.json", {p: all_posts[p] for p in posts})
    write_json(output / "train_report.json", {
        "algorithm": "implicit ALS, exact normal equations, binary likes, c=1+alpha*r",
        "data": args.data, "users": len(users), "posts": len(posts), "likes": len(rows),
        "factors": args.factors, "alpha": args.alpha, "regularization": args.regularization,
        "iterations": args.iterations, "seed": args.seed,
        "seconds": time.perf_counter() - started, "history": history,
        "numpy_version": np.__version__,
        "train_csv_sha256": hashlib.sha256((processed / "train.csv").read_bytes()).hexdigest(),
    })
    print(f"Saved real trained factors to {output}")


def load_run(run):
    folder = ROOT / "artifacts" / run
    mapping = read_json(folder / "id_mapping.json")
    model = np.load(folder / "model.npz", allow_pickle=False)
    users, posts = mapping["user_ids"], mapping["post_ids"]
    groups, post_groups = neighborhoods(read_csv(folder / "train.csv"), users, posts)
    popularity = np.array([len(g) for g in post_groups], dtype=float)
    return folder, users, posts, model["user_factors"], model["item_factors"], groups, popularity


def top_k(scores, seen, k):
    values = np.asarray(scores, dtype=float).copy()
    values[seen] = -np.inf
    ids = np.flatnonzero(np.isfinite(values))
    # Stable deterministic tie break by mapped post index, same for both models.
    return ids[np.lexsort((ids, -values[ids]))[:k]]


def ranking_metrics(predicted, target, k):
    hits = [1 if int(p) in target else 0 for p in predicted[:k]]
    recall = sum(hits) / len(target)
    dcg = sum(hit / math.log2(rank + 2) for rank, hit in enumerate(hits))
    ideal = sum(1 / math.log2(rank + 2) for rank in range(min(k, len(target))))
    return recall, dcg / ideal


def evaluate(args):
    folder, users, posts, x, y, groups, popularity = load_run(args.run)
    report = read_json(folder / "train_report.json")
    rows = read_csv(ROOT / "data/processed" / report["data"] / f"{args.split}.csv")
    umap, pmap = {u: i for i, u in enumerate(users)}, {p: i for i, p in enumerate(posts)}
    targets = {}
    cold_user, cold_post, seen = 0, 0, 0
    for u, p, _ in rows:
        if u not in umap:
            cold_user += 1
        elif p not in pmap:
            cold_post += 1
        elif pmap[p] in groups[umap[u]]:
            seen += 1
        else:
            targets.setdefault(u, set()).add(pmap[p])
    selected = stable_order(targets, args.seed)
    if args.max_eval_users:
        selected = selected[:args.max_eval_users]
    if not selected:
        raise ValueError("No warm users with unseen warm targets in this split")
    metrics = {"als": [], "popularity": []}
    with threadpool_limits(limits=1):
        for u in selected:
            index = umap[u]
            for name, scores in [("als", y @ x[index]), ("popularity", popularity)]:
                ranked = top_k(scores, groups[index], args.k)
                metrics[name].append(ranking_metrics(ranked, targets[u], args.k))
    result = {
        "split": args.split, "k": args.k, "seed": args.seed,
        "protocol": "frozen train snapshot; full train catalog; train likes excluded; macro warm metrics",
        "split_rows": len(rows), "cold_user_rows": cold_user, "cold_post_rows_known_user": cold_post,
        "already_seen_rows": seen, "warm_target_rows": sum(len(t) for t in targets.values()),
        "warm_target_coverage": sum(len(t) for t in targets.values()) / len(rows),
        "users_in_split": len({r[0] for r in rows}), "eligible_users": len(targets),
        "evaluated_users": len(selected), "max_eval_users": args.max_eval_users,
        "metrics": {name: {f"Recall@{args.k}": float(np.mean([r[0] for r in values])),
                           f"NDCG@{args.k}": float(np.mean([r[1] for r in values]))}
                    for name, values in metrics.items()},
    }
    write_json(folder / f"{args.split}_metrics.json", result)
    print(json.dumps(result, indent=2))


def recommend(args):
    folder, users, posts, x, y, groups, popularity = load_run(args.run)
    user = args.user or users[0]
    if user in users:
        index = users.index(user)
        scores, history, method = y @ x[index], groups[index], "als"
    else:
        scores, history, method = popularity, np.array([], dtype=int), "popularity_fallback"
    metadata = read_json(folder / "posts.json")
    result = {"user_id": user, "method": method, "recommendations": [
        {"post_id": posts[int(i)], "score": float(scores[i]),
         "text": metadata[posts[int(i)]]["text"], "date": metadata[posts[int(i)]]["date"]}
        for i in top_k(scores, history, args.k)]}
    write_json(folder / "recommendations.json", result)
    print(json.dumps(result, ensure_ascii=True, indent=2))


def positive(value):
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("Must be positive")
    return number


def nonnegative(value):
    number = int(value)
    if number < 0:
        raise argparse.ArgumentTypeError("Must be nonnegative")
    return number


def positive_float(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("Must be finite and positive")
    return number


def safe_name(value):
    if not value or value in {".", ".."} or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in value):
        raise argparse.ArgumentTypeError("Use letters, digits, underscore or hyphen")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("download")
    p.set_defaults(func=download)
    p = commands.add_parser("prepare")
    p.add_argument("--feed", default="Science")
    p.add_argument("--name", type=safe_name, default="science-small")
    p.add_argument("--max-users", type=nonnegative, default=2000)
    p.add_argument("--min-user-likes", type=positive, default=3)
    p.add_argument("--min-post-likes", type=positive, default=2)
    p.add_argument("--seed", type=int, default=42)
    p.set_defaults(func=prepare)
    p = commands.add_parser("train")
    p.add_argument("--data", type=safe_name, default="science-small")
    p.add_argument("--run", type=safe_name, default="als-16")
    p.add_argument("--factors", type=positive, default=16)
    p.add_argument("--iterations", type=positive, default=10)
    p.add_argument("--alpha", type=positive_float, default=20)
    p.add_argument("--regularization", type=positive_float, default=0.1)
    p.add_argument("--seed", type=int, default=42)
    p.set_defaults(func=train)
    p = commands.add_parser("evaluate")
    p.add_argument("--run", type=safe_name, default="als-16")
    p.add_argument("--split", choices=["validation", "test"], default="validation")
    p.add_argument("--k", type=positive, default=10)
    p.add_argument("--max-eval-users", type=nonnegative, default=1000)
    p.add_argument("--seed", type=int, default=42)
    p.set_defaults(func=evaluate)
    p = commands.add_parser("recommend")
    p.add_argument("--run", type=safe_name, default="als-16")
    p.add_argument("--user")
    p.add_argument("--k", type=positive, default=10)
    p.set_defaults(func=recommend)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
