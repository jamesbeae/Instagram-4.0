import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Input from "../../UI/Input/Input";
import SearchedResult from "./SearchedResult";
import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { sideBarActions } from "../../../lib/redux/sideBarSlice";
import { User } from "../../../models/User";
import { Post } from "../../../models/Post";

const SearchModal = () => {
    const openedModal = useAppSelector(state => state.sideBarSlice.openedModal);
    const dispatch = useAppDispatch();
    const http = usePrivateHttp();
    const [search, setSearch] = useState("");
    const [scope, setScope] = useState<'users' | 'posts'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        if (openedModal !== 'search' || !search.trim()) { setUsers([]); setPosts([]); setPages(0); setLoading(false); setError(''); return; }
        const controller = new AbortController();
        setLoading(true); setError(''); setUsers([]); setPosts([]); setPages(0);
        const timer = window.setTimeout(() => {
            http.get('/search', { params: { q: search.trim(), scope, page, limit: 10 }, signal: controller.signal })
                .then(result => {
                    if (controller.signal.aborted) return;
                    setUsers(result.data.users); setPosts(result.data.postsList); setPages(result.data.pagination.totalPages);
                })
                .catch(() => { if (!controller.signal.aborted) setError('Search failed. Please try again.'); })
                .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        }, 250);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [openedModal, search, scope, page, http]);
    return <div className={(openedModal === 'search' ? 'w-[min(384px,calc(100vw-72px))] border-r' : 'w-0 border-0') + ' h-full py-2 flex flex-col bg-dark overflow-hidden border-lightDark'}>
        <h2 className="px-6 py-4 text-2xl text-white font-semibold">Search</h2>
        <Input className="mx-4 mb-4 px-4 py-2 text-white bg-lightDark rounded-md" name="search" id="search" type="text" placeholder="Search accounts or posts" getInputValueHandler={(value: string) => { setSearch(value); setPage(1); }} />
        <div className="flex gap-4 px-6 pb-4 text-white" role="tablist" aria-label="Search type">
            <button role="tab" aria-selected={scope === 'users'} onClick={() => { setScope('users'); setPage(1); }}>Accounts</button>
            <button role="tab" aria-selected={scope === 'posts'} onClick={() => { setScope('posts'); setPage(1); }}>Posts</button>
        </div>
        <div className="overflow-y-auto flex-1 text-white" role="tabpanel">
            {!search.trim() && <p className="px-6 text-textGray">Enter a name or words from a post.</p>}
            {loading && <p className="px-6" role="status">Searching…</p>}
            {error && <p className="px-6 text-red-400" role="alert">{error}</p>}
            {!loading && !error && search.trim() && users.length === 0 && posts.length === 0 && <p className="px-6">No results found.</p>}
            {scope === 'users' ? <SearchedResult results={users} /> : posts.map(post => <Link key={post._id} to={'/post/' + post._id} onClick={() => dispatch(sideBarActions.openModal('search'))} className="block px-6 py-3 border-b border-lightDark hover:bg-lightDark">
                <p className="font-semibold">{post.userId.username}</p><p className="break-words">{post.caption}</p>
            </Link>)}
            {!loading && pages > 1 && <div className="flex gap-4 justify-center py-4">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>{page}/{pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>}
        </div>
    </div>;
};
export default SearchModal;
