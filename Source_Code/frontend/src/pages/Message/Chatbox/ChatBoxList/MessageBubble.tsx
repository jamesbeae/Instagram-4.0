import type { ReactNode, Ref } from "react";
import type { Message } from "../../../../models/Message";

function trimLinkEnd(value: string) {
    const bracketBalance = { ")": 0, "]": 0, "}": 0 };
    for (const character of value) {
        switch (character) {
            case "(": bracketBalance[")"]++; break;
            case "[": bracketBalance["]"]++; break;
            case "{": bracketBalance["}"]++; break;
            case ")":
            case "]":
            case "}": bracketBalance[character]--; break;
        }
    }
    let end = value.length;
    while (end > 0) {
        const character = value[end - 1];
        if (character === ")" || character === "]" || character === "}") {
            if (bracketBalance[character] >= 0) break;
            bracketBalance[character]++;
        } else if (!/[.,!?;:…]/u.test(character)) {
            break;
        }
        end--;
    }
    return value.slice(0, end);
}

function renderMessageText(text: string): ReactNode {
    const parts: ReactNode[] = [];
    let offset = 0;

    for (const match of text.matchAll(/(^|[\s([{<"'“‘])((?:https?:\/\/|www\.)[^\s<>"'“”‘’]+)/giu)) {
        const label = trimLinkEnd(match[2]);
        const href = /^www\./i.test(label) ? "https://" + label : label;
        if (!/^https?:\/\/[^/\\]/i.test(href)) continue;

        let url: URL;
        try {
            url = new URL(href);
        } catch {
            continue;
        }
        const start = match.index! + match[1].length;
        parts.push(text.slice(offset, start));
        parts.push(<a key={start} href={url.href} target="_blank" rel="noopener noreferrer">{label}</a>);
        offset = start + label.length;
    }

    return offset ? [...parts, text.slice(offset)] : text;
}

export default function MessageBubble({ isOwn, message, rowRef }: { isOwn: boolean; message: Message; rowRef?: Ref<HTMLDivElement> }) {
    const sentAt = message.createdAt ? new Date(message.createdAt) : null;
    return (
        <div ref={rowRef} className="message-bubble-row" data-own={isOwn} tabIndex={0}>
            <p className="message-bubble">{renderMessageText(message.contents)}</p>
            {sentAt && Number.isFinite(sentAt.getTime()) && (
                <time dateTime={sentAt.toISOString()}>{sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            )}
        </div>
    );
}
