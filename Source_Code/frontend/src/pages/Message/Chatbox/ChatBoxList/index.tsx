import { useLayoutEffect, useRef } from "react";
import Button from "../../../../components/UI/Button/Button";
import useInfiniteScroll from "../../../../hooks/useInfiniteScroll";
import { useAppSelector } from "../../../../hooks/useStore";
import type { Message } from "../../../../models/Message";
import MessageBubble from "./MessageBubble";

function offsetInHistory(message: HTMLElement, history: HTMLElement) {
    return message.getBoundingClientRect().top - history.getBoundingClientRect().top + history.scrollTop;
}

export default function ChatBoxList({ messages, loadOlder, loadingOlder, olderError, canMessage }: {
    messages: Message[];
    loadOlder?: () => Promise<void>;
    loadingOlder: boolean;
    olderError: boolean;
    canMessage: boolean;
}) {
    const chatContainer = useRef<HTMLDivElement>(null);
    const firstRow = useRef<HTMLDivElement>(null);
    const previous = useRef<{ lastId: string; anchor: HTMLDivElement; offset: number }>();
    const nearBottom = useRef(true);
    const currentUserId = useAppSelector(state => state.authSlice.userInfo?._id);
    const lastMessage = messages[messages.length - 1];
    const olderSentinel = useInfiniteScroll({
        enabled: Boolean(loadOlder) && !loadingOlder && !olderError,
        onReach: loadOlder, rootRef: chatContainer, rootMargin: "120px 0px 0px",
    });

    function updateBottomState(container: HTMLElement) {
        nearBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight <= 80;
    }

    useLayoutEffect(() => {
        const container = chatContainer.current;
        const anchor = firstRow.current;
        if (!container || !anchor || !lastMessage) return;
        const before = previous.current;
        if (!before || (before.lastId !== lastMessage._id && (nearBottom.current || lastMessage.sender_id === currentUserId))) {
            container.scrollTop = container.scrollHeight;
        } else if (container.contains(before.anchor)) {
            container.scrollTop += offsetInHistory(before.anchor, container) - before.offset;
        }
        previous.current = { lastId: lastMessage._id, anchor, offset: offsetInHistory(anchor, container) };
        updateBottomState(container);
    }, [messages, currentUserId, lastMessage, loadingOlder, olderError]);

    return (
        <div ref={chatContainer} onScroll={event => updateBottomState(event.currentTarget)}
            className="message-history" role="log" aria-label="Message history">
            <div className="message-thread">
                {loadOlder && <div ref={olderSentinel} className="h-px shrink-0" aria-hidden="true" />}
                {loadOlder && (
                    <Button className="message-load-older" onClick={loadOlder} disabled={loadingOlder}>
                        {loadingOlder ? "Loading older messages…" : olderError ? "Try again" : "Load older messages"}
                    </Button>
                )}
                {olderError && <p className="message-thread-empty" role="alert">Unable to load older messages. Try again.</p>}
                {messages.length === 0 && (
                    <p className="message-thread-empty">{canMessage ? "No messages yet. Say hello!" : "No messages yet."}</p>
                )}
                {messages.map((message, index) => (
                    <MessageBubble key={message._id} isOwn={message.sender_id === currentUserId} message={message} rowRef={index === 0 ? firstRow : undefined} />
                ))}
            </div>
        </div>
    );
}
