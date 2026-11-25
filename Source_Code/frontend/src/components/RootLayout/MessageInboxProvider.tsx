import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useMatch } from "react-router-dom";
import usePrivateHttp from "../../hooks/usePrivateHttp";
import { useAppSelector } from "../../hooks/useStore";
import type { Message } from "../../models/Message";
import type { User } from "../../models/User";
import { socket } from "../../socket/socket";
import "./MessageInbox.css";

export type InboxUser = User & {
    lastMessage: { contents: string; senderId: string; createdAt: string } | null;
};

type Inbox = { contacts: InboxUser[]; unread: string[]; unreadCount?: number };
type InboxState = {
    inbox: Inbox | null;
    failed: boolean;
    unreadBadgeCount: number;
    markRead: (messageId: string) => Promise<void>;
};

const InboxContext = createContext<InboxState>({ inbox: null, failed: false, unreadBadgeCount: 0, markRead: async () => {} });

export const useMessageInbox = () => useContext(InboxContext);

export default function MessageInboxProvider({ children }: { children: ReactNode }) {
    const http = usePrivateHttp();
    const userId = useAppSelector(state => state.authSlice.userInfo?._id);
    const activeChat = useMatch("/message/:user_id")?.params.user_id;
    const currentChat = useRef(activeChat);
    currentChat.current = activeChat;
    const request = useRef(0);
    const [inbox, setInbox] = useState<Inbox | null>(null);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState<Message | null>(null);

    const refresh = useCallback(async () => {
        const generation = ++request.current;
        try {
            const { data } = await http.get<Inbox>("/message/inbox");
            if (generation !== request.current) return;
            setInbox(data);
            setFailed(false);
        } catch {
            if (generation === request.current) setFailed(true);
        }
    }, [http]);

    const markRead = useCallback(async (messageId: string) => {
        await http.post("/message/read", { messageId });
        await refresh();
    }, [http, refresh]);

    const unreadBadgeCount = inbox?.unreadCount ?? inbox?.unread.length ?? 0;

    useEffect(() => {
        if (!userId) return;
        function receive(message: Message) {
            if (!message.sender_id || message.receiver_id !== userId) return;
            if (currentChat.current !== message.sender_id || !document.hasFocus() || document.hidden) {
                setNotice(message);
            }
            void refresh();
        }
        void refresh();
        socket.on("receiveMessage", receive);
        socket.on("connect", refresh);
        socket.on("messageInboxChanged", refresh);
        return () => {
            request.current++;
            socket.off("receiveMessage", receive);
            socket.off("connect", refresh);
            socket.off("messageInboxChanged", refresh);
        };
    }, [refresh, userId]);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(null), 5000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const sender = inbox?.contacts.find(contact => contact._id === notice?.sender_id);
    const name = sender?.username || sender?.fullName;
    return (
        <InboxContext.Provider value={{ inbox, failed, unreadBadgeCount, markRead }}>
            {children}
            <div className="message-notice" role="status">
                {notice && (
                    <Link to={"/message/" + notice.sender_id} onClick={() => setNotice(null)}>
                        {name ? `New message from ${name}` : "New message"}
                    </Link>
                )}
            </div>
        </InboxContext.Provider>
    );
}
