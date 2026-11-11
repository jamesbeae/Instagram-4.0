import { useEffect, useState } from 'react';
import Post from './Post';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { postsListActions } from '../../../lib/redux/postsListSlice';
import usePrivateHttp from '../../../hooks/usePrivateHttp';
export default function PostsList() {
    const http = usePrivateHttp(), dispatch = useAppDispatch(), posts = useAppSelector(s => s.postsListSlice);
    const [page, setPage] = useState(1), [pages, setPages] = useState(1), [error, setError] = useState(''), [loading, setLoading] = useState(false), [mode, setMode] = useState('recommended');
    useEffect(() => { let active = true; setLoading(true); http.get(mode === 'recommended' ? '/post/recommended' : '/post/feed', { params: { page, limit: 10 } }).then(r => { if (active) {
        dispatch(page === 1 ? postsListActions.addPosts(r.data.postsList) : postsListActions.appendPosts(r.data.postsList));
        setPages(r.data.pagination.totalPages);
        setError('');
    } }).catch(() => { if (active)
        setError('Unable to load feed'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [http, dispatch, page, mode]);
    return <div className="text-white flex flex-col items-center max-w-[630px] mt-6"><div className="flex gap-4 mb-4"><button onClick={() => { setMode('recommended'); setPage(1); }} aria-pressed={mode === 'recommended'}>For you</button><button onClick={() => { setMode('recent'); setPage(1); }} aria-pressed={mode === 'recent'}>Latest</button></div>{error && <p role="alert">{error}</p>}{posts.map(p => <Post key={p._id} postData={p}/>)}{loading && <p role="status">Loading…</p>}{page < pages && <button disabled={loading} onClick={() => setPage(p => p + 1)}>Load more</button>}{!loading && !posts.length && <p>No posts yet.</p>}</div>;
}
