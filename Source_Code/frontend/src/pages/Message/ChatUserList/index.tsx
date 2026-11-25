import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import Avatar from "../../../components/UI/Avatar/Avatar";
import Button from "../../../components/UI/Button/Button";
import Input from "../../../components/UI/Input/Input";
import Loading from "../../../components/UI/Loading";
import type { InboxUser } from "../../../components/RootLayout/MessageInboxProvider";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import type { User } from "../../../models/User";

function formatMessageTime(value: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ`;
    return `${Math.floor(hours / 24)} ngày`;
}

export default function ChatUserList({ users, online, unread, currentUserId, loadError }: {
    users: InboxUser[] | null;
    online: string[];
    unread: string[];
    currentUserId?: string;
    loadError: boolean;
}) {
    const http = usePrivateHttp();
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState<{ users: User[]; totalPages: number }>();
    const [searchError, setSearchError] = useState(false);
    const [inputKey, setInputKey] = useState(0);

    useEffect(() => {
        if (!query) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const { data } = await http.get<{ users: User[]; pagination: { totalPages: number } }>("/search", {
                    params: { q: query, scope: "users", page, limit: 20 }, signal: controller.signal,
                });
                if (!controller.signal.aborted) {
                    setSearch({ users: data.users.filter(user => user._id !== currentUserId), totalPages: data.pagination.totalPages });
                }
            } catch {
                if (!controller.signal.aborted) setSearchError(true);
            }
        }, 250);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [http, currentUserId, query, page]);

    function changeQuery(value: string) {
        const next = value.trim();
        if (next === query) return;
        setQuery(next);
        changePage(1);
    }

    function changePage(next: number) {
        setPage(next);
        setSearch(undefined);
        setSearchError(false);
    }

    function renderContact(user: User, lastMessage?: InboxUser["lastMessage"]) {
        const name = user.fullName || user.username;
        const isOnline = online.includes(user._id);
        const preview = lastMessage
            ? `${lastMessage.senderId === currentUserId ? "Bạn: " : ""}${lastMessage.contents}`
            : user.username && `@${user.username}`;
        return (
            <NavLink key={user._id} end to={`/message/${user._id}`} state={{ user }} className="message-contact"
                onClick={() => {
                    if (!query) return;
                    changeQuery("");
                    setInputKey(value => value + 1);
                }}>
                <span className="message-avatar" data-online={isOnline} role="img" aria-label={isOnline ? "Đang hoạt động" : "Ngoại tuyến"}>
                    <Avatar avatarUrl={user.avatar} username={name} className="h-10 w-10" />
                </span>
                <span className="message-contact-label">
                    <span className="message-contact-name">{name}</span>
                    <span className="message-contact-preview" title={preview}>{preview}</span>
                </span>
                {lastMessage && <time className="message-contact-time" dateTime={lastMessage.createdAt}>{formatMessageTime(lastMessage.createdAt)}</time>}
                {unread.includes(user._id) && <span className="message-unread"><span className="sr-only">Unread messages</span></span>}
            </NavLink>
        );
    }

    return (
        <aside className="message-inbox" aria-labelledby="message-inbox-title">
            <h1 id="message-inbox-title">Messages</h1>
            <Input key={inputKey} type="search" className="message-recipient-search" placeholder="Find someone to message"
                aria-label="Find someone to message" getInputValueHandler={changeQuery} />
            <div className="message-contacts">
                {query ? <>
                    {searchError && <p role="alert" className="message-list-status">Unable to search for accounts.</p>}
                    {!search && !searchError && <Loading align="start" message="Searching accounts…" className="message-list-status" />}
                    {search?.users.length === 0 && <p className="message-list-status">No matching accounts.</p>}
                    {search?.users.map(user => renderContact(user))}
                    {search && search.totalPages > 1 && (
                        <div className="message-search-pages" aria-label="Search results pages" role="group">
                            <Button disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
                            <Button disabled={page >= search.totalPages} onClick={() => changePage(page + 1)}>Next</Button>
                        </div>
                    )}
                </> : <>
                    {loadError && <p role="alert" className="message-list-status">Unable to load conversations.</p>}
                    {!users && !loadError && <Loading align="start" message="Loading conversations…" className="message-list-status" />}
                    {users?.length === 0 && <p className="message-list-status">No conversations yet.</p>}
                    {users?.map(user => renderContact(user, user.lastMessage))}
                </>}
            </div>
        </aside>
    );
}
