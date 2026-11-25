import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
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

const historyPageSize = 50;

function compareMessages(a: Message, b: Message) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a._id.localeCompare(b._id);
}

export default function ChatBox() {
    const { user_id } = useParams();
    const online = useOutletContext<string[]>();
    const initialUser = useLocation().state?.user as User | undefined;
    const [recipient, setRecipient] = useState<User | null>();
    const [recipientError, setRecipientError] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [sendError, setSendError] = useState("");
    const [olderCursor, setOlderCursor] = useState<string>();
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [olderError, setOlderError] = useState(false);
    const olderRequest = useRef<AbortController>();
    const loadedHistory = useRef(false);
    const newestLoadedId = useRef<string>();
    newestLoadedId.current = messages[messages.length - 1]?._id;
    const sendAttempt = useRef<{ contents: string; id: string }>();
    const currentUserId = useAppSelector(state => state.authSlice.userInfo?._id);
    const http = usePrivateHttp();
    const { inbox, markRead } = useMessageInbox();
    const user = recipient ?? inbox?.contacts.find(peer => peer._id === user_id) ?? initialUser;
    const canMessage = Boolean(recipient);
    const { isTyping, stopTyping, updateTyping } = useConversationTyping(recipient?._id);
    const latestIncoming = messages.reduce<string | undefined>((latest, message) =>
        message.receiver_id === currentUserId && message.sender_id === user_id ? message._id : latest, undefined);
    const markedMessage = useRef<string>();

    useEffect(() => {
        function markVisibleMessage() {
            if (loading || loadError || !latestIncoming || latestIncoming === markedMessage.current ||
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
    }, [latestIncoming, loading, loadError, markRead]);

    useEffect(() => {
        if (!user_id) return;
        let request: AbortController | undefined;
        async function loadRecipient() {
            request?.abort();
            const controller = new AbortController();
            request = controller;
            try {
                const { data } = await http.get<{ user: User }>("/message/recipient", {
                    params: { receiver_id: user_id }, signal: controller.signal,
                });
                if (!controller.signal.aborted) {
                    setRecipient(data.user);
                    setRecipientError(false);
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                const unavailable = isAxiosError(error) && error.response?.status === 404;
                setRecipient(unavailable ? null : undefined);
                setRecipientError(!unavailable);
            }
        }
        void loadRecipient();
        socket.on("connect", loadRecipient);
        return () => {
            request?.abort();
            socket.off("connect", loadRecipient);
        };
    }, [http, user_id]);

    useEffect(() => {
        if (!user_id) return;
        let generation = 0;
        async function loadConversation() {
            const requestId = ++generation;
            const previousNewest = newestLoadedId.current;
            try {
                const { data } = await http.get<Message[]>("/message", {
                    params: { receiver_id: user_id, limit: historyPageSize + 1 },
                });
                if (requestId !== generation) return;
                const history = data.slice(-historyPageSize);
                const historyIds = new Set(history.map(message => message._id));
                // After a long disconnect, start from the latest page so the cursor can fill the gap.
                const resetHistory = loadedHistory.current && data.length > historyPageSize &&
                    (!previousNewest || !historyIds.has(previousNewest));
                if (resetHistory) {
                    olderRequest.current?.abort();
                    olderRequest.current = undefined;
                    setLoadingOlder(false);
                    setOlderError(false);
                }
                if (!loadedHistory.current || resetHistory) {
                    setOlderCursor(data.length > historyPageSize ? history[0]._id : undefined);
                    loadedHistory.current = true;
                }
                setLoadError(false);
                setMessages(previous => {
                    const latest = history[history.length - 1];
                    const extras = previous.filter(message => !historyIds.has(message._id) &&
                        (!resetHistory || compareMessages(message, latest) > 0));
                    return [...history, ...extras].sort(compareMessages);
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

    useEffect(() => () => olderRequest.current?.abort(), [user_id]);

    const loadOlder = useCallback(async () => {
        if (!user_id || !olderCursor || olderRequest.current) return;
        const controller = new AbortController();
        olderRequest.current = controller;
        setLoadingOlder(true);
        setOlderError(false);
        try {
            const { data } = await http.get<Message[]>("/message", {
                params: { receiver_id: user_id, before: olderCursor, limit: historyPageSize + 1 },
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            const older = data.slice(-historyPageSize);
            setOlderCursor(data.length > historyPageSize ? older[0]._id : undefined);
            setMessages(previous => {
                const knownIds = new Set(previous.map(message => message._id));
                return [...older.filter(message => !knownIds.has(message._id)), ...previous];
            });
        } catch {
            if (!controller.signal.aborted) setOlderError(true);
        } finally {
            if (olderRequest.current === controller) olderRequest.current = undefined;
            if (!controller.signal.aborted) setLoadingOlder(false);
        }
    }, [http, olderCursor, user_id]);

    async function sendMessage(contents: string) {
        contents = contents.trim();
        const receiverId = recipient?._id;
        if (!contents || !receiverId) return false;
        stopTyping();
        if (!socket.connected) {
            setSendError("Connection unavailable. Please try again.");
            return false;
        }
        if (sendAttempt.current?.contents !== contents) {
            sendAttempt.current = { contents, id: crypto.randomUUID() };
        }
        const messageId = sendAttempt.current.id;
        return new Promise<boolean>(resolve => {
            socket.timeout(10000).emit("sendMessage", { receiverId, contents, messageId }, (error: Error | null, result?: {
                ok: boolean;
                message: Message | string;
                status?: number;
            }) => {
                if (!error && result?.status === 404) {
                    setRecipient(null);
                    resolve(false);
                    return;
                }
                if (error || !result?.ok || typeof result.message !== "object") {
                    setSendError(typeof result?.message === "string" ? result.message : "Unable to send message");
                    resolve(false);
                    return;
                }
                const sent = result.message;
                sendAttempt.current = undefined;
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
            {!loading && !loadError && (
                <ChatBoxList messages={messages} loadOlder={olderCursor ? loadOlder : undefined}
                    loadingOlder={loadingOlder} olderError={olderError} canMessage={canMessage} />
            )}
            {sendError && <p className="message-send-error" role="alert">{sendError}</p>}
            {canMessage && (
                <>
                    <div className="message-typing" role="status" hidden={!isTyping}>
                        {isTyping && `${user?.username || user?.fullName || "They"} is typing…`}
                    </div>
                    <ChatBoxInput sendMessage={sendMessage} onDraftChange={updateTyping} />
                </>
            )}
            {recipientError && <p className="message-typing" role="alert">Unable to load the recipient.</p>}
            {recipient === null && <p className="message-typing" role="status">This account is unavailable for messaging.</p>}
        </section>
    );
}
