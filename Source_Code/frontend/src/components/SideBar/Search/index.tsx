import SidebarPanel from "../SidebarPanel";
import Loading from "../../UI/Loading";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Input from "../../UI/Input/Input";
import SearchedResult from "./SearchedResult";
import PostSearchResult from "./PostSearchResult";
import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { postDetailModalActions } from "../../../lib/redux/postDetailModalSlice";
import type { User } from "../../../models/User";
import type { Post } from "../../../models/Post";
import "./Search.css";

const searchScopes = [
    { value: "all", label: "All" },
    { value: "users", label: "Accounts" },
    { value: "posts", label: "Posts" },
] as const;
type Scope = typeof searchScopes[number]["value"];
type SearchPage = { users: User[]; postsList: Post[]; pagination: { totalPages: number; total?: number } };
type SearchResults = { users: User[]; posts: Post[]; pages: number; total: number };
const emptyResults: SearchResults = { users: [], posts: [], pages: 0, total: 0 };

const SearchModal = () => {
    const openedModal = useAppSelector(state => state.sideBarSlice.openedModal);
    const dispatch = useAppDispatch();
    const { pathname } = useLocation();
    const http = usePrivateHttp();
    const isOpen = openedModal === "search";
    const [search, setSearch] = useState("");
    const [scope, setScope] = useState<Scope>("all");
    const [{ users, posts, pages, total }, setResults] = useState(emptyResults);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        setResults(emptyResults);
        setError("");
        const query = search.trim();
        if (!isOpen || !query) { setLoading(false); return; }
        const controller = new AbortController();
        setLoading(true);
        const timer = window.setTimeout(() => {
            const limit = scope === "all" ? 5 : 10;
            function fetchPage(scope: "users" | "posts") {
                return http.get<SearchPage>("/search", {
                    params: { q: query, scope, page, limit }, signal: controller.signal,
                }).then(response => response.data);
            }
            Promise.all([
                scope !== "posts" ? fetchPage("users") : undefined,
                scope !== "users" ? fetchPage("posts") : undefined,
            ])
                .then(([accountPage, postPage]) => {
                    if (controller.signal.aborted) return;
                    const users = accountPage?.users ?? [];
                    const posts = postPage?.postsList ?? [];
                    setResults({
                        users, posts,
                        pages: Math.max(accountPage?.pagination.totalPages ?? 0, postPage?.pagination.totalPages ?? 0),
                        total: (accountPage?.pagination.total ?? users.length) + (postPage?.pagination.total ?? posts.length),
                    });
                })
                .catch(() => { if (!controller.signal.aborted) setError('Search failed. Please try again.'); })
                .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        }, 250);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [isOpen, search, scope, page, http]);
    if (!isOpen) return null;
    const resultLabel = scope === "posts" ? "post" : scope === "users" ? "account" : "result";

    return <SidebarPanel name="search" title="Search" controls={<>
            <Input className="sidebar-search-input" name="search" id="search" type="text"
                defaultValue={search} placeholder="Search accounts or posts"
                getInputValueHandler={(value: string) => { setSearch(value); setPage(1); }} />
            <div className="sidebar-search-scopes" role="group" aria-label="Search type">
                {searchScopes.map(({ value, label }) => (
                    <button key={value} type="button" aria-pressed={scope === value}
                        onClick={() => { if (scope !== value) { setScope(value); setPage(1); } }}>{label}</button>
                ))}
            </div>
        </>}>
        <div role="region" aria-label="Search results">
            {!search.trim() && <p className="px-6 text-textGray">Enter a name or words from a post.</p>}
            {loading && <Loading message="Searching…" align="start" className="px-6" />}
            {error && <p className="px-6 text-red-400" role="alert">{error}</p>}
            {!loading && !error && search.trim() && users.length === 0 && posts.length === 0 && <p className="px-6">No results found.</p>}
            {(users.length > 0 || posts.length > 0) && (
                <div className="sidebar-post-results">
                    <p role="status" className="sidebar-post-result-count">
                        {total.toLocaleString()} {resultLabel}{total === 1 ? "" : "s"} found
                    </p>
                    <ul>
                        {Array.from({ length: Math.max(users.length, posts.length) }, (_, index) => {
                            const user = users[index];
                            const post = posts[index];
                            return [
                                user && <li key={`account-${user._id}`}><SearchedResult user={user} /></li>,
                                post && <li key={`post-${post._id}`}>
                                    <PostSearchResult post={post} onOpen={() => dispatch(postDetailModalActions.openPostDetailModal({
                                        post, prePath: pathname,
                                    }))} />
                                </li>,
                            ];
                        })}
                    </ul>
                </div>
            )}
            {!loading && pages > 1 && <div className="flex gap-4 justify-center py-4">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>{page}/{pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>}
        </div>
    </SidebarPanel>;
};
export default SearchModal;
