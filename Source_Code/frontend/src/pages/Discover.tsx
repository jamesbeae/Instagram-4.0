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
}
