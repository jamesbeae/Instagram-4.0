import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
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
}
