<<<<<<< HEAD
<<<<<<< Updated upstream
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
=======
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
>>>>>>> origin/feature/reels-messages-notifications-ui-fixed
import Button from '../components/UI/Button/Button';
import Loading from '../components/UI/Loading';
import usePrivateHttp from '../hooks/usePrivateHttp';
import publicHttp from '../lib/axios/http';
import { useAppSelector } from '../hooks/useStore';
import type { Post } from '../models/Post';
import ExploreGrid from './ExploreGrid';
import ReelsFeed from './ReelsFeed';

type Mode = 'explore' | 'reels';
type FeedPage = { postsList: Post[]; users?: { _id: string; username: string; fullName?: string; avatar?: string }[]; pagination: { totalPages: number } };
type PageRequest = { page: number };

export default function Discover() {
    const mode: Mode = useLocation().pathname.endsWith('/reels') ? 'reels' : 'explore';
    return <DiscoverFeed key={mode} mode={mode} />;
}

function DiscoverFeed({ mode }: { mode: Mode }) {
    const privateHttp = usePrivateHttp();
    const userInfo = useAppSelector(state => state.authSlice.userInfo);
    const http = userInfo ? privateHttp : publicHttp;
    const [searchParams] = useSearchParams();
    const query = mode === 'explore' ? (searchParams.get('q') || '').trim() : '';
    const scope = searchParams.get('scope') === 'posts' ? 'posts' : 'users';
    const isExplore = mode === 'explore';
    const [request, setRequest] = useState<PageRequest>({ page: 1 });
    const [posts, setPosts] = useState<Post[]>([]);
    const [users, setUsers] = useState<NonNullable<FeedPage['users']>>([]);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        const endpoint = query ? '/search' : `/post/${mode}`;
        void http.get<FeedPage>(endpoint, {
            params: query ? { q: query, scope, page: request.page, limit: 10 } : { page: request.page, limit: isExplore ? 10 : 12 },
            signal: controller.signal,
        }).then(({ data }) => {
            if (controller.signal.aborted) return;
            setUsers(data.users || []);
            setPosts(previous => {
                if (request.page === 1) return data.postsList;
                const seen = new Set(previous.map(post => post._id));
                return [...previous, ...data.postsList.filter(post => !seen.has(post._id))];
            });
            setPages(data.pagination.totalPages);
        }).catch((reason: any) => {
            if (!controller.signal.aborted) setError(reason?.response?.data?.message || 'Unable to load content. Please try again.');
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [http, isExplore, mode, request, query, scope]);

    const loadPage = useCallback((page: number) => {
        setLoading(true);
        setError('');
        setRequest({ page });
    }, []);

    const loadNextPage = useCallback(() => {
        loadPage(error ? request.page : request.page + 1);
    }, [error, loadPage, request.page]);

    if (mode === 'reels') return <ReelsFeed posts={posts} loading={loading} error={error} hasMore={request.page < pages} onLoadMore={loadNextPage} />;

    return (
        <main className="discover-page explore-page min-w-0 flex-1 overflow-auto">
            <div className="explore-content">
                <h1 className="mb-4 text-xl">{query ? `Search ${scope}: ${query}` : 'Explore'}</h1>
                {query && scope === 'users' ? <div className="flex flex-col gap-3">{users.map(user => <Link key={user._id} to={`/profile/${user._id}`} className="border border-lightDark rounded p-3">{user.fullName || user.username} <span className="text-textGray">@{user.username}</span></Link>)}</div> : <ExploreGrid posts={posts} />}
                {!loading && !error && !(query && scope === 'users' ? users.length : posts.length) && <p>{query ? `No ${scope} found.` : 'No posts yet.'}</p>}
                <div className="explore-pagination">
                    {loading && <Loading message="Loading posts…" className="py-4" />}
                    {error && <p role="alert">{error}</p>}
                    {!loading && (error || request.page < pages) && (
                        <Button className="explore-load-more" onClick={loadNextPage}>
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
