import { useEffect, useRef } from "react";
import { useAppSelector } from "../../../../hooks/useStore";
import type { Message } from "../../../../models/Message";
import MessageBubble from "./MessageBubble";

export default function ChatBoxList({ messages }: { messages: Message[] }) {
    const chatContainer = useRef<HTMLDivElement>(null);
    const currentUserId = useAppSelector(state => state.authSlice.userInfo?._id);
    useEffect(() => {
        const container = chatContainer.current;
        if (container) container.scrollTop = container.scrollHeight;
    }, [messages]);

    return (
        <div ref={chatContainer} className="message-history" role="log" aria-label="Message history">
            <div className="message-thread">
                {messages.length === 0 && <p className="message-thread-empty">No messages yet. Say hello!</p>}
                {messages.map(message => (
                    <MessageBubble key={message._id} isOwn={message.sender_id === currentUserId} message={message} />
                ))}
            </div>
        </div>
    );
}
