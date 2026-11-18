import { useState } from "react";
import { useAppSelector } from "../../../hooks/useStore";
import Avatar from "../../UI/Avatar/Avatar";
import Button from "../../UI/Button/Button";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile } from "@fortawesome/free-regular-svg-icons";
import Textarea from "../../UI/Input/Textarea";

export default function StatusInput({ onCaptionChange }: { onCaptionChange: (value: string) => void }) {
    const user = useAppSelector(state => state.authSlice.userInfo);
    const [isEmojiVisible, setIsEmojiVisible] = useState(false);
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
                    <Button className="create-post-close" aria-label="Choose emoji" aria-expanded={isEmojiVisible}
                        onClick={() => setIsEmojiVisible(value => !value)}><FontAwesomeIcon icon={faFaceSmile} /></Button>
                </div>
                {isEmojiVisible && <div className="create-post-emoji">
                    <Picker data={data} maxFrequentRows={0} perLine={7}
                        onEmojiSelect={(emoji: { native: string }) => setEmojis(value => [...value, emoji.native])} />
                </div>}
            </div>
        </div>
    );
}
