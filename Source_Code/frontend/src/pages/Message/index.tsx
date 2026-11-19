import { useEffect, useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import Card from "../../components/UI/Card";
import MessageIcon from "../../components/UI/Icons/MessageIcon";
import { useMessageInbox } from "../../components/RootLayout/MessageInboxProvider";
import { socket } from "../../socket/socket";
import ChatUserList from "./ChatUserList";
import "./Message.css";

export default function Message() {
    const { inbox, failed } = useMessageInbox();
    const [online, setOnline] = useState<string[]>([]);
    const selectedUserId = useMatch("/message/:user_id")?.params.user_id;

    useEffect(() => {
        const update = (ids: string[]) => setOnline(ids);
        socket.on("onlineUsers", update);
        socket.emit("addUser");
        return () => { socket.off("onlineUsers", update); };
    }, []);

    return (
        <main className="message-page">
            <Card as="section" className="message-card" aria-label="Messages" data-conversation-open={Boolean(selectedUserId)}>
                <ChatUserList users={inbox?.contacts ?? null} online={online} unread={inbox?.unread ?? []} loadError={failed} />
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
