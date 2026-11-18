import { useState } from "react";
import { useAppSelector } from "../../../hooks/useStore";
import Avatar from "../../UI/Avatar/Avatar";
import EmojiPicker from "../../UI/EmojiPicker";
import Textarea from "../../UI/Input/Textarea";

export default function StatusInput({ onCaptionChange }: { onCaptionChange: (value: string) => void }) {
    const user = useAppSelector(state => state.authSlice.userInfo);
    const [emojis, setEmojis] = useState<string[]>([]);

    return (
        <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 shrink-0" avatarUrl={user?.avatar} username={user?.username} />
            <div className="create-post-caption">
                <label htmlFor="create-post-caption" className="sr-only">Caption</label>
                <Textarea id="create-post-caption" name="caption" placeholder="Write a caption…"
                    getTextareaValueHandler={onCaptionChange} addedEmojis={emojis}
                    className="block w-full border-0 bg-transparent placeholder:text-textGray " />
                <div className="flex justify-end">
                    <EmojiPicker onSelect={emoji => setEmojis(value => [...value, emoji])} />
                </div>
            </div>
        </div>
    );
}
