import React, { useState } from "react";
import Button from "../../../../components/UI/Button/Button";
import { useUnsavedChanges } from "../../../../components/UnsavedChanges";
import Textarea from "../../../../components/UI/Input/Textarea";
import EmojiPicker from "../../../../components/UI/EmojiPicker";
const ChatBoxInput: React.FC<{
    sendMessage: Function;
}> = ({ sendMessage }) => {
    const [message, setMessage] = useState("");
    const [emojis, setEmojis] = useState<string[]>([]);
    const [isSent, setIsSent] = useState(false);
    const { markSaved } = useUnsavedChanges(message !== "");
    const [sending, setSending] = useState(false);
    const handleSendMessage = async () => {
        if (sending)
            return;
        setSending(true);
        try {
            if (await sendMessage(message)) {
                markSaved();
                setMessage("");
                setIsSent(pre => !pre);
            }
        }
        finally {
            setSending(false);
        }
    };
    return (<div className="p-4 border-t border-lightSecondDark">
            <form className="flex items-center gap-3 border border-lightSecondDark min-h-[44px] rounded-full px-6">
                <EmojiPicker disabled={sending} onSelect={emoji => setEmojis(value => [...value, emoji])} />

                <div className="flex-1 text-white relative">
                    <Textarea name="message" id="message" placeholder="Add a message" getTextareaValueHandler={(value: string) => {
            setMessage(value);
        }} handleEnterKey={() => {
            handleSendMessage();
        }} addedEmojis={emojis} className="w-full leading-4 text-sm h-[44px] flex align-middle border-none bg-transparent focus:outline-none resize-none" clear={isSent}/>
                </div>

                {message ? (<Button onClick={() => handleSendMessage()} disabled={sending} className="text-blue font-semibold">{sending ? "Sending…" : "Send"}</Button>) : (<>
                        <Button className="text-blue font-semibold" disabled={true}>Send</Button>
                    </>)}
            </form>
        </div>);
};
export default ChatBoxInput;
