import { NavLink } from "react-router-dom";
import Avatar from "../../../components/UI/Avatar/Avatar";
<<<<<<< Updated upstream
import Loading from "../../../components/UI/Loading";
import type { User } from "../../../models/User";
=======
import { User } from "../../../models/User";
import { useAppSelector } from "../../../hooks/useStore";
import { useParams } from "react-router-dom";
import useRedirect from "../../../hooks/useRedirect";
const ChatUserList: React.FC<{
    users: User[] | null;
}> = ({ users }) => {
    const [online, setOnline] = React.useState<string[]>([]);
    React.useEffect(() => { const update = (ids: string[]) => setOnline(ids); socket.on("onlineUsers", update); socket.emit("addUser"); return () => { socket.off("onlineUsers", update); }; }, []);
    const param = useParams();
    const { gotoMessagePage } = useRedirect();
    const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(param.user_id);
    const onUserSelect = (userId: string, user: User) => {
        gotoMessagePage(userId, user);
        setSelectedUserId(userId);
    };
    const currentUser = useAppSelector((state) => state.authSlice.userInfo);
    return (<div className="chat-list-panel w-96 h-screen dark:bg-black border-r border-lightDark dark:border-gray-800 flex flex-col">
            <div className="p-4 border-b border-lightSecondDark">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">
                        {currentUser?.username || currentUser?.fullName}
                    </h2>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {users &&
            users.map((user) => (<div key={user._id} className={`p-3 hover:bg-lightSecondDark cursor-pointer transition-colors ${selectedUserId === user._id
                    ? "bg-lightSecondDark"
                    : ""}`} onClick={() => onUserSelect(user._id, user)}>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Avatar className="w-12 h-12" avatarUrl={user.avatar}/>
                                </div>
>>>>>>> Stashed changes

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
