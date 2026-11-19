import { Link } from "react-router-dom";
import Avatar from "../../../../components/UI/Avatar/Avatar";
import ChevronIcon from "../../../../components/UI/Icons/ChevronIcon";
import type { User } from "../../../../models/User";

export default function ChatBoxHeader({ user, online }: { user?: User; online: boolean }) {
    const name = user?.username || user?.fullName;
    return (
        <header className="message-header">
            <Link className="message-back" to="/message" aria-label="Back to messages">
                <ChevronIcon />
            </Link>
            {user && (
                <span className="message-avatar" data-online={online} aria-hidden="true">
                    <Avatar avatarUrl={user.avatar} username={name} className="h-10 w-10" />
                </span>
            )}
            <div className="message-header-label">
                <h2>{name || "Conversation"}</h2>
                {online && <p className="message-presence">Online</p>}
            </div>
        </header>
    );
}
