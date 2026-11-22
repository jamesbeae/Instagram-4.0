import { useEffect, useRef, useState } from "react";
import { useMessageInbox } from "../../../components/RootLayout/MessageInboxProvider";
import useConversationTyping from "./useConversationTyping";
import { useLocation, useOutletContext, useParams } from "react-router-dom";
import Loading from "../../../components/UI/Loading";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { useAppSelector } from "../../../hooks/useStore";
import type { Message } from "../../../models/Message";
import type { User } from "../../../models/User";
import { socket } from "../../../socket/socket";
import ChatBoxHeader from "./ChatBoxHeader";
import ChatBoxInput from "./ChatBoxInput";
import ChatBoxList from "./ChatBoxList";

export default function ChatBox() {
    const { user_id } = useParams();
    const online = useOutletContext<string[]>();
    const initialUser = useLocation().state?.user as User | undefined;
    const [user, setUser] = useState(initialUser);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [sendError, setSendError] = useState("");
    const currentUserId = useAppSelector(state => state.authSlice.userInfo?._id);
    const http = usePrivateHttp();
    const { inbox, failed, markRead } = useMessageInbox();
    const canMessage = inbox?.contacts.some(contact => contact._id === user_id) ?? false;
    const { isTyping, stopTyping, updateTyping } = useConversationTyping(canMessage ? user_id : undefined);
    const latestIncoming = messages.reduce<string | undefined>((latest, message) =>
        message.receiver_id === currentUserId && message.sender_id === user_id ? message._id : latest, undefined);
    const markedMessage = useRef<string>();

    useEffect(() => {
        function markVisibleMessage() {
            if (loading || !latestIncoming || latestIncoming === markedMessage.current ||
                document.hidden || !document.hasFocus()) return;
            markedMessage.current = latestIncoming;
            void markRead(latestIncoming).catch(() => {
                if (markedMessage.current === latestIncoming) markedMessage.current = undefined;
            });
        }

        markVisibleMessage();
        window.addEventListener("focus", markVisibleMessage);
        document.addEventListener("visibilitychange", markVisibleMessage);
        return () => {
            window.removeEventListener("focus", markVisibleMessage);
            document.removeEventListener("visibilitychange", markVisibleMessage);
        };
    }, [latestIncoming, loading, markRead]);

    useEffect(() => {
        if (!user_id) return;
        let generation = 0;
        async function loadConversation() {
            const requestId = ++generation;
            try {
                const [profile, history] = await Promise.all([
                    http.get("/user/get-profile", { params: { _id: user_id } }),
                    http.get<Message[]>("/message", { params: { receiver_id: user_id } }),
                ]);
                if (requestId !== generation) return;
                setUser(profile.data.profile);
                setLoadError(false);
                setMessages(previous => {
                    const historyIds = new Set(history.data.map(message => message._id));
                    return [...history.data, ...previous.filter(message => !historyIds.has(message._id))]
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                });
            } catch {
                if (requestId === generation) setLoadError(true);
            } finally {
                if (requestId === generation) setLoading(false);
            }
        }

        void loadConversation();
        socket.on("connect", loadConversation);
        return () => {
            generation++;
            socket.off("connect", loadConversation);
        };
    }, [user_id, http]);

    useEffect(() => {
        const receive = (message: Message) => {
            if (message.sender_id === user_id && message.receiver_id === currentUserId) {
                setMessages(previous => previous.some(item => item._id === message._id) ? previous : [...previous, message]);
            }
        };
        socket.on("receiveMessage", receive);
        return () => { socket.off("receiveMessage", receive); };
    }, [user_id, currentUserId]);

    async function sendMessage(contents: string) {
        if (!contents.trim() || !user_id || !canMessage) return false;
        stopTyping();
        if (!socket.connected) {
            setSendError("Connection unavailable. Please try again.");
            return false;
        }
<<<<<<< Updated upstream
        return new Promise<boolean>(resolve => {
            socket.timeout(10000).emit("sendMessage", { receiverId: user_id, contents }, (error: Error | null, result?: {
                ok: boolean;
                message: Message | string;
            }) => {
                if (error || !result?.ok || typeof result.message !== "object") {
                    setSendError(typeof result?.message === "string" ? result.message : "Unable to send message");
                    resolve(false);
                    return;
                }
                const sent = result.message;
                setSendError("");
                setMessages(previous => previous.some(item => item._id === sent._id) ? previous : [...previous, sent]);
                resolve(true);
            });
        });
    }

    return (
        <section className="message-chat" aria-label="Conversation">
            <ChatBoxHeader user={user} online={Boolean(user_id && online.includes(user_id))} />
            {loading && <Loading message="Loading conversation…" className="message-chat-status" />}
            {loadError && <p className="message-chat-status" role="alert">Unable to load conversation.</p>}
            {!loading && !loadError && <ChatBoxList messages={messages} />}
            {sendError && <p className="message-send-error" role="alert">{sendError}</p>}
            {canMessage && (
                <>
                    <div className="message-typing" role="status" hidden={!isTyping}>
                        {isTyping && `${user?.username || user?.fullName || "They"} is typing…`}
                    </div>
                    <ChatBoxInput sendMessage={sendMessage} onDraftChange={updateTyping} />
                </>
            )}
            {!inbox && failed && <p className="message-typing" role="alert">Unable to check who you can message.</p>}
            {user && inbox && !canMessage && (
                <p className="message-typing">You can send messages when you follow each other.</p>
            )}
        </section>
    );
=======
        return new Promise<boolean>(resolve => socket.timeout(10000).emit('sendMessage', { receiverId: user_id, contents }, (err: any, result: any) => {
            if (err || !result?.ok) {
                setError(result?.message || 'Unable to send message');
                resolve(false);
                return;
            }
            setError('');
            setMessages(prev => [...prev, result.message]);
            resolve(true);
        }));
    };
    if (!user)
        return <p role="status" className="text-white p-6">{error || 'Loading conversation…'}</p>;
    return <div className="message-thread flex-1 h-full flex flex-col"><ChatBoxHeader user={user}/>{error && <p role="alert" className="text-red-400 p-2">{error}</p>}<ChatBoxList messages={messages} sendingUser={user}/><ChatBoxInput sendMessage={sendMessage}/></div>;
>>>>>>> Stashed changes
}
