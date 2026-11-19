import type { Message } from "../../../../models/Message";

export default function MessageBubble({ isOwn, message }: { isOwn: boolean; message: Message }) {
    const sentAt = message.createdAt ? new Date(message.createdAt) : null;
    return (
        <div className="message-bubble-row" data-own={isOwn} tabIndex={0}>
            <p className="message-bubble">{message.contents}</p>
            {sentAt && Number.isFinite(sentAt.getTime()) && (
                <time dateTime={sentAt.toISOString()}>{sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            )}
        </div>
    );
}
