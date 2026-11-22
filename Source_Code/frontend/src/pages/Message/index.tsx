import { useEffect, useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import Card from "../../components/UI/Card";
import MessageIcon from "../../components/UI/Icons/MessageIcon";
import { useMessageInbox } from "../../components/RootLayout/MessageInboxProvider";
import { socket } from "../../socket/socket";
import { useAppSelector } from "../../hooks/useStore";
import ChatUserList from "./ChatUserList";
<<<<<<< Updated upstream
import "./Message.css";

export default function Message() {
    const { inbox, failed } = useMessageInbox();
    const currentUserId = useAppSelector(state => state.authSlice.userInfo?._id);
    const [online, setOnline] = useState<string[]>([]);
    const selectedUserId = useMatch("/message/:user_id")?.params.user_id;

=======
import { User } from "../../models/User";
import { getAllUsers } from "../../services/userService";
import { useParams } from "react-router-dom";

const Message = () => {
    const { user_id } = useParams();
    const [users, setUsers] = useState<User[] | null>(null);
>>>>>>> Stashed changes
    useEffect(() => {
        const update = (ids: string[]) => setOnline(ids);
        socket.on("onlineUsers", update);
        socket.emit("addUser");
        return () => { socket.off("onlineUsers", update); };
    }, []);
<<<<<<< Updated upstream
=======
    return (
        <div className={`messages-page h-screen flex flex-1 ${user_id ? "has-active-chat" : ""}`}>
            <ChatUserList users={users} />
            {user_id ? <Outlet /> : <div className="message-empty-state"><span>✉</span><h2>Your messages</h2><p>Select a conversation to start chatting.</p></div>}
        </div>
    );
};
>>>>>>> Stashed changes

    return (
        <main className="message-page">
            <Card as="section" className="message-card" aria-label="Messages" data-conversation-open={Boolean(selectedUserId)}>
                <ChatUserList users={inbox?.contacts ?? null} online={online} unread={inbox?.unread ?? []} currentUserId={currentUserId} loadError={failed} />
                <div className="message-conversation" key={selectedUserId}>
                    {selectedUserId ? <Outlet context={online} /> : (
                        <div className="message-empty">
                            <span className="message-empty-icon" aria-hidden="true"><MessageIcon /></span>
                            <h2>Your messages</h2>
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </div>
            </Card>
        </main>
    );
}
