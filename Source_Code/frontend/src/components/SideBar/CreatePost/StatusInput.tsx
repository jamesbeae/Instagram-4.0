import React, { useCallback, useState } from "react";
import { useAppSelector } from "../../../hooks/useStore";
import Avatar from "../../UI/Avatar/Avatar";
import Textarea from "../../UI/Input/Textarea";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile } from "@fortawesome/free-regular-svg-icons";

const StatusInput: React.FC<{ getCaptionHandler: Function }> = ({
    getCaptionHandler,
}) => {
    const authSlice = useAppSelector((state) => state.authSlice);
    const currentUser = authSlice.userInfo;
    const [isEmojiVisible, setIsEmojiVisible] = useState(false);
    const [emojis, setEmojis] = useState<string[]>([]);

    const addEmoji = useCallback((e: any) => {
        setEmojis((pre) => [...pre, e.native]);
    }, []);

    return (
        <div className="w-full sm:w-2/5 min-h-[220px] shrink-0 flex flex-col border-t sm:border-t-0 sm:border-l border-textGray">
            <div className="my-5 mx-4 flex gap-3 items-center">
                <Avatar
                    className={"w-7 h-7 shrink-0"}
                    avatarUrl={currentUser?.avatar}
                />
                <p className="text-white font-semibold">
                    {currentUser?.username}
                </p>
            </div>
            <div className="flex-1">
                <Textarea
                    className="w-full h-2/5 px-5 text-white bg-#262626 border-0 resize-none focus:outline-none placeholder:text-textGray"
                    id="caption"
                    name="caption"
                    placeholder="Write a caption..."
                    getTextareaValueHandler={getCaptionHandler}
                    addedEmojis={emojis}
                />
                <div className="relative w-full h-3/5">
                    <FontAwesomeIcon
                        icon={faFaceSmile}
                        onClick={() => {
                            setIsEmojiVisible(!isEmojiVisible);
                        }}
                        className="mx-5 text-textGray cursor-pointer"
                    />
                    {isEmojiVisible && (
                        <div className="absolute top-0 left-10 w-full h-full first:h-full">
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
            </div>
        </div>
    );
};

export default StatusInput;
