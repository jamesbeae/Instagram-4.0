<<<<<<< Updated upstream
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../components/UI/Button/Button';
import Loading from '../components/UI/Loading';
import PostCard from '../components/PostCard';
import usePrivateHttp from '../hooks/usePrivateHttp';
import type { Post } from '../models/Post';
import ExploreGrid from './ExploreGrid';

type Mode = 'explore' | 'reels';
type FeedPage = { postsList: Post[]; pagination: { totalPages: number } };
type PageRequest = { page: number };

export default function Discover() {
    const mode: Mode = useLocation().pathname.endsWith('/reels') ? 'reels' : 'explore';
    return <DiscoverFeed key={mode} mode={mode} />;
}

function DiscoverFeed({ mode }: { mode: Mode }) {
    const http = usePrivateHttp();
    const isExplore = mode === 'explore';
    const [request, setRequest] = useState<PageRequest>({ page: 1 });
    const [posts, setPosts] = useState<Post[]>([]);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        void http.get<FeedPage>(`/post/${mode}`, {
            params: { page: request.page, limit: isExplore ? 10 : 12 },
            signal: controller.signal,
        }).then(({ data }) => {
            if (controller.signal.aborted) return;
            setPosts(previous => {
                if (request.page === 1) return data.postsList;
                const seen = new Set(previous.map(post => post._id));
                return [...previous, ...data.postsList.filter(post => !seen.has(post._id))];
            });
            setPages(data.pagination.totalPages);
        }).catch(() => {
            if (!controller.signal.aborted) setError(true);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [http, isExplore, mode, request]);

    function loadPage(page: number) {
        setLoading(true);
        setError(false);
        setRequest({ page });
    }

    return (
        <main className={`discover-page flex-1 min-w-0 overflow-auto ${isExplore ? 'explore-page' : 'p-4'}`}>
            <div className={isExplore ? 'explore-content' : undefined}>
                <h1 className="text-xl mb-4 capitalize">{mode}</h1>
                {isExplore ? <ExploreGrid posts={posts} /> : (
                    <div className="flex flex-col items-center">
                        {posts.map(post => <PostCard key={post._id} postData={post} />)}
                    </div>
                )}
                {!loading && !error && !posts.length && (
                    <p>{isExplore ? 'No posts yet.' : 'No videos yet. Create a post with a video to publish a Reel.'}</p>
                )}
                <div className={isExplore ? 'explore-pagination' : undefined}>
                    {loading && <Loading message="Loading posts…" className="py-4" />}
                    {error && <p role="alert">Unable to load content.</p>}
                    {!loading && (error || request.page < pages) && (
                        <Button className={isExplore ? 'explore-load-more' : 'p-3'}
                            onClick={() => loadPage(error ? request.page : request.page + 1)}>
                            {error ? 'Try again' : 'Load more'}
                        </Button>
                    )}
                </div>
            </div>
        </main>
    );
=======
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import usePrivateHttp from "../hooks/usePrivateHttp";
import { Post } from "../models/Post";
import PostCard from "./Home/PostsList/Post";

const topics = ["For you", "Photography", "Travel", "Design", "Food", "Technology"];

export default function Discover() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const mode = location.pathname.endsWith("reels") ? "reels" : "explore";
    const http = usePrivateHttp();
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [error, setError] = useState("");
    const [retryCount, setRetryCount] = useState(0);
    const topic = searchParams.get("topic") || "For you";

    useEffect(() => {
        setPage(1);
        setPosts([]);
        setError("");
    }, [mode]);

    useEffect(() => {
        let active = true;
        http.get("/post/" + mode, { params: { page, limit: 12 } }).then((response) => {
            if (!active) return;
            setPosts((previous) => page === 1 ? response.data.postsList : [...previous, ...response.data.postsList]);
            setPages(response.data.pagination.totalPages);
            setError("");
        }).catch(() => {
            if (active) setError("Unable to load content. Try again.");
        });
        return () => { active = false; };
    }, [mode, page, http, retryCount]);

    const visiblePosts = useMemo(() => {
        if (mode === "reels" || topic === "For you") return posts;
        const query = topic.toLowerCase().replace(/^#/, "");
        return posts.filter((post) => `${post.caption || ""} ${post.userId.username || ""}`.toLowerCase().includes(query));
    }, [mode, posts, topic]);

    const chooseTopic = (nextTopic: string) => {
        setSearchParams(nextTopic === "For you" ? {} : { topic: nextTopic });
    };

    return <main className={`discover-page ${mode === "reels" ? "reels-page" : ""} flex-1 min-w-0 overflow-auto text-white`}>
        <div className="discover-heading">
            <div><p className="discover-eyebrow">FIND YOUR COMMUNITY</p><h1>{mode === "reels" ? "Reels" : "Discover"}</h1>
                <p>{mode === "reels" ? "Short moments. Big perspectives." : "Explore ideas, creators, and places from your community."}</p></div>
        </div>
        {mode === "explore" && <div className="discover-topics" role="tablist" aria-label="Explore topics">
            {topics.map((item) => <button key={item} type="button" role="tab" aria-selected={topic.toLowerCase() === item.toLowerCase()} onClick={() => chooseTopic(item)}>{item}</button>)}
        </div>}
        {error && <div className="discover-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)}>Try again</button></div>}
        {!error && !visiblePosts.length && <div className="discover-empty"><strong>{mode === "reels" ? "No Reels to show yet" : topic === "For you" ? "Nothing to discover yet" : `No posts found for ${topic}`}</strong><span>{mode === "reels" ? "Video posts from your community will appear here." : "Try another topic or check back when your community shares more."}</span></div>}
        {visiblePosts.length > 0 && <div className={mode === "explore" ? "discover-grid" : "reels-feed"}>
            {visiblePosts.map((post) => mode === "reels" ? <PostCard key={post._id} postData={post} /> : <Link key={post._id} to={`/post/${post._id}`} className="discover-tile">
                {post.photoVideo[0]?.type === "VIDEO" ? <video src={post.photoVideo[0].url} muted className="h-full w-full object-cover" /> : <img src={post.photoVideo[0]?.url} alt={post.caption} className="h-full w-full object-cover" />}
                <span>{post.likes.length} likes · {post.comments.length} comments</span>
            </Link>)}
        </div>}
        {page < pages && !error && <button className="discover-load-more" onClick={() => setPage((current) => current + 1)}>Load more</button>}
    </main>;
>>>>>>> Stashed changes
}
