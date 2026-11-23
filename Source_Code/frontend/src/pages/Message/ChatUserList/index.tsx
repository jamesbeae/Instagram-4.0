import { NavLink } from "react-router-dom";
import Avatar from "../../../components/UI/Avatar/Avatar";
import Loading from "../../../components/UI/Loading";
import type { User } from "../../../models/User";

type InboxContact = User & {
    lastMessage?: { contents: string; senderId: string; createdAt: string } | null;
};

function formatMessageTime(value: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ`;
    return `${Math.floor(hours / 24)} ngày`;
}

export default function ChatUserList({ users, online, unread, currentUserId, loadError }: {
    users: InboxContact[] | null;
    online: string[];
    unread: string[];
    currentUserId?: string;
    loadError: boolean;
}) {
    return (
        <aside className="message-inbox" aria-labelledby="message-inbox-title">
            <h1 id="message-inbox-title">Messages</h1>
            <div className="message-contacts">
                {loadError && <p role="alert" className="message-list-status">Unable to load contacts.</p>}
                {!users && !loadError && <Loading align="start" message="Loading contacts…" className="message-list-status" />}
                {users?.length === 0 && <p className="message-list-status">You can message people when you follow each other.</p>}
                {users?.map(user => {
                    const name = user.fullName || user.username;
                    const isOnline = online.includes(user._id);
                    const lastMessage = user.lastMessage;
                    const preview = lastMessage
                        ? `${lastMessage.senderId === currentUserId ? "Bạn: " : ""}${lastMessage.contents}`
                        : "Chưa có tin nhắn";
                    return (
                        <NavLink key={user._id} end to={`/message/${user._id}`} state={{ user }} className="message-contact">
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
                })}
            </div>
        </aside>
    );
}
