import Loading from "../../../components/UI/Loading";
import { useEffect, useId, useState } from 'react';
import { DraftScope, useConfirmDiscard } from '../../../components/UnsavedChanges';
import PostCard from '../../../components/PostCard';
import OptionGroup from '../../../components/UI/OptionGroup';

import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { postsListActions } from '../../../lib/redux/postsListSlice';
import usePrivateHttp from '../../../hooks/usePrivateHttp';
import LoginPromptModal from '../../../components/LoginPromptModal';
const feedOptions = [{ id: 'recommended', label: 'For you' }, { id: 'recent', label: 'Latest' }] as const;

export default function PostsList() {
    const draftScope = useId();
    const confirmDiscard = useConfirmDiscard();
    const http = usePrivateHttp(), dispatch = useAppDispatch(), posts = useAppSelector(s => s.postsListSlice), userInfo = useAppSelector(s => s.authSlice.userInfo);
    const [page, setPage] = useState(1), [pages, setPages] = useState(1), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(false), [loginPrompt, setLoginPrompt] = useState(false), [mode, setMode] = useState<typeof feedOptions[number]['id']>(() => userInfo ? 'recommended' : 'recent');
    useEffect(() => { let active = true; setLoading(true); setError(''); setNotice(''); const params = { params: { page, limit: 10 } };
        const request = async () => {
            if (!userInfo || mode !== 'recommended') return http.get('/post/feed', params);
            try {
                const recommended = await http.get('/post/recommended', params);
                if (recommended.data.postsList?.length) return recommended;
            } catch { /* Use the chronological feed if recommendations are unavailable. */ }
            const fallback = await http.get('/post/feed', params);
            fallback.data.fallback = true;
            return fallback;
        };
        request().then(r => { if (active) {
        dispatch(page === 1 ? postsListActions.addPosts(r.data.postsList) : postsListActions.appendPosts(r.data.postsList));
        setPages(r.data.pagination.totalPages);
        if (userInfo && r.data.fallback) setNotice('No recommendations are available. Showing the latest posts instead.');
        setError('');
    } }).catch(() => { if (active)
        setError('Unable to load feed'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [http, dispatch, page, mode, userInfo]);
    return <div className="home-feed-list text-foreground flex flex-col items-center w-full min-w-0 mt-4"><div className="mb-4 w-full max-w-[248px]"><OptionGroup label="Feed order" options={feedOptions} value={mode} onChange={value => { if (value === mode) return; if (!userInfo && value === 'recommended') { setLoginPrompt(true); return; } confirmDiscard(() => { setMode(value); setPage(1); }, draftScope); }} /></div>{notice && <p role="status" className="text-sm mb-3">{notice}</p>}{error && <p role="alert">{error}</p>}<DraftScope.Provider value={draftScope}>{posts.map(p => <PostCard key={p._id} postData={p}/>)}</DraftScope.Provider>{loading && <Loading className="py-4" />}{page < pages && <button disabled={loading} onClick={() => setPage(p => p + 1)}>Load more</button>}{!loading && !posts.length && !error && <p>No posts yet.</p>}{loginPrompt && <LoginPromptModal onClose={() => setLoginPrompt(false)} />}</div>;
}
