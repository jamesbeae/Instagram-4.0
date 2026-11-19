import { NavLink } from "react-router-dom";
import Avatar from "../../../components/UI/Avatar/Avatar";
import Loading from "../../../components/UI/Loading";
import type { User } from "../../../models/User";

export default function ChatUserList({ users, online, loadError }: {
    users: User[] | null;
    online: string[];
    loadError: boolean;
}) {
    return (
        <aside className="message-inbox" aria-labelledby="message-inbox-title">
            <h1 id="message-inbox-title">Messages</h1>
            <div className="message-contacts">
                {loadError && <p role="alert" className="message-list-status">Unable to load contacts.</p>}
                {!users && !loadError && <Loading align="start" message="Loading contacts…" className="message-list-status" />}
                {users?.length === 0 && <p className="message-list-status">No contacts yet.</p>}
                {users?.map(user => {
                    const name = user.username || user.fullName;
                    const isOnline = online.includes(user._id);
                    return (
                        <NavLink key={user._id} end to={`/message/${user._id}`} state={{ user }} className="message-contact">
                            <span className="message-avatar" data-online={isOnline} aria-hidden="true">
                                <Avatar avatarUrl={user.avatar} username={name} className="h-10 w-10" />
                            </span>
                            <span className="message-contact-label">
                                <span className="message-contact-name">{name}</span>
                                {isOnline && <span className="message-presence">Online</span>}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </aside>
    );
}
