import { useEffect, useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import Card from "../../components/UI/Card";
import MessageIcon from "../../components/UI/Icons/MessageIcon";
import type { User } from "../../models/User";
import { getAllUsers } from "../../services/userService";
import { socket } from "../../socket/socket";
import ChatUserList from "./ChatUserList";
import "./Message.css";

export default function Message() {
    const [users, setUsers] = useState<User[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [online, setOnline] = useState<string[]>([]);
    const selectedUserId = useMatch("/message/:user_id")?.params.user_id;

    useEffect(() => {
        let active = true;
        void getAllUsers().then(result => {
            if (!active) return;
            if (result) setUsers(result.data.users);
            else setLoadError(true);
        });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const update = (ids: string[]) => setOnline(ids);
        socket.on("onlineUsers", update);
        socket.emit("addUser");
        return () => { socket.off("onlineUsers", update); };
    }, []);

    return (
        <main className="message-page">
            <Card as="section" className="message-card" aria-label="Messages" data-conversation-open={Boolean(selectedUserId)}>
                <ChatUserList users={users} online={online} loadError={loadError} />
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
