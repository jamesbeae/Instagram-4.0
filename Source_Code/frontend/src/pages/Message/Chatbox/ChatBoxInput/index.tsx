import { useState } from "react";
import Button from "../../../../components/UI/Button/Button";
import { useUnsavedChanges } from "../../../../components/UnsavedChanges";
import Textarea from "../../../../components/UI/Input/Textarea";
import EmojiPicker from "../../../../components/UI/EmojiPicker";

export default function ChatBoxInput({ sendMessage, onDraftChange }: {
    sendMessage: (message: string) => Promise<boolean>;
    onDraftChange: (draft: string) => void;
}) {
    const [message, setMessage] = useState("");
    const [emojis, setEmojis] = useState<string[]>([]);
    const [clear, setClear] = useState(false);
    const [sending, setSending] = useState(false);
    const { markSaved } = useUnsavedChanges(message !== "");
    const canSend = Boolean(message.trim()) && !sending;

    async function handleSendMessage() {
        if (!canSend) return;
        setSending(true);
        try {
            if (await sendMessage(message)) {
                markSaved();
                setMessage("");
                setClear(value => !value);
            }
        } finally {
            setSending(false);
        }
    }

    return (
        <form className="message-compose" onSubmit={event => {
            event.preventDefault();
            void handleSendMessage();
        }}>
            <EmojiPicker disabled={sending} onSelect={emoji => setEmojis(value => [...value, emoji])} />
            <label className="sr-only" htmlFor="message">Message</label>
            <Textarea name="message" id="message" placeholder="Write a message…" getTextareaValueHandler={(draft: string) => {
                setMessage(draft);
                onDraftChange(draft);
            }}
                handleEnterKey={handleSendMessage} addedEmojis={emojis} className="message-input " clear={clear} />
            <Button type="submit" className="message-send" disabled={!canSend}>{sending ? "Sending…" : "Send"}</Button>
        </form>
    );
}
