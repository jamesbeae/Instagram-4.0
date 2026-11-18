import Loading from "../../../components/UI/Loading";
import { useEffect, useId, useState } from 'react';
import { DraftScope, useConfirmDiscard } from '../../../components/UnsavedChanges';
import PostCard from '../../../components/PostCard';
import OptionGroup from '../../../components/UI/OptionGroup';

import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { postsListActions } from '../../../lib/redux/postsListSlice';
import usePrivateHttp from '../../../hooks/usePrivateHttp';
const feedOptions = [{ id: 'recommended', label: 'For you' }, { id: 'recent', label: 'Latest' }] as const;

export default function PostsList() {
    const draftScope = useId();
    const confirmDiscard = useConfirmDiscard();
    const http = usePrivateHttp(), dispatch = useAppDispatch(), posts = useAppSelector(s => s.postsListSlice);
    const [page, setPage] = useState(1), [pages, setPages] = useState(1), [error, setError] = useState(''), [loading, setLoading] = useState(false), [mode, setMode] = useState<typeof feedOptions[number]['id']>('recommended');
    useEffect(() => { let active = true; setLoading(true); http.get(mode === 'recommended' ? '/post/recommended' : '/post/feed', { params: { page, limit: 10 } }).then(r => { if (active) {
        dispatch(page === 1 ? postsListActions.addPosts(r.data.postsList) : postsListActions.appendPosts(r.data.postsList));
        setPages(r.data.pagination.totalPages);
        setError('');
    } }).catch(() => { if (active)
        setError('Unable to load feed'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [http, dispatch, page, mode]);
    return <div className="text-white flex flex-col items-center w-full max-w-[630px] mt-6"><div className="mb-4 w-full max-w-[224px]"><OptionGroup label="Feed order" options={feedOptions} value={mode} onChange={value => { if (value !== mode) confirmDiscard(() => { setMode(value); setPage(1); }, draftScope); }} /></div>{error && <p role="alert">{error}</p>}<DraftScope.Provider value={draftScope}>{posts.map(p => <PostCard key={p._id} postData={p}/>)}</DraftScope.Provider>{loading && <Loading className="py-4" />}{page < pages && <button disabled={loading} onClick={() => setPage(p => p + 1)}>Load more</button>}{!loading && !posts.length && <p>No posts yet.</p>}</div>;
}
