import React, { useCallback, useEffect, useRef, useState } from "react";
import Button from "../../../../components/UI/Button/Button";
import Textarea from "../../../../components/UI/Input/Textarea";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import EmojiIcon from "../../../../components/UI/Icons/EmojiIcon";

const ChatBoxInput: React.FC<{ sendMessage: Function }> = ({ sendMessage }) => {
    const [message, setMessage] = useState("");
    const [emojis, setEmojis] = useState<string[]>([]);
    const [isEmojiVisible, setIsEmojiVisible] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement | null>(null);
    const [isSent, setIsSent] = useState(false);

    // Hàm kiểm tra click ngoài
    const handleClickOutside = (event: any) => {
        if (
            emojiPickerRef.current &&
            !emojiPickerRef.current.contains(event.target)
        ) {
            setIsEmojiVisible(false);
        }
    };

    const addEmoji = useCallback((e: any) => {
        setEmojis((pre) => [...pre, e.native]);
    }, []);

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSendMessage = () => {
        sendMessage(message);
        setIsSent(pre => !pre);
    };

    return (
        <div className="p-4 border-t border-lightSecondDark">
            <form className="flex items-center gap-3 border border-lightSecondDark min-h-[44px] rounded-full px-6">
                <div className="cursor-pointer relative" ref={emojiPickerRef}>
                    <div
                        className="pt-[2px]"
                        onClick={() => {
                            setIsEmojiVisible(!isEmojiVisible);
                        }}
                    >
                        <EmojiIcon />
                    </div>
                    {isEmojiVisible && (
                        <div className="absolute -top-[328px] left-0 w-full h-full first:h-full z-20">
                            <Picker
                                data={data}
                                maxFrequentRows={0}
                                onEmojiSelect={(e: any) => {
                                    addEmoji(e);
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 text-white relative">
                    <Textarea
                        name="message"
                        id="message"
                        placeholder="Add a message"
                        getTextareaValueHandler={(value: string) => {
                            setMessage(value);
                        }}
                        handleEnterKey={() => {
                            handleSendMessage();
                        }}
                        addedEmojis={emojis}
                        className="w-full leading-4 text-sm h-[44px] flex align-middle border-none bg-transparent focus:outline-none resize-none"
                        clear={isSent}
                    />
                </div>

                {message ? (
                    <Button
                        onClick={() => handleSendMessage()}
                        content="Send"
                        className="text-blue font-semibold"
                    />
                ) : (
                    <>
                        <Button
                            content="Send"
                            className="text-blue font-semibold"
                            disable={true}
                        />
                    </>
                )}
            </form>
        </div>
    );
};

export default ChatBoxInput;
