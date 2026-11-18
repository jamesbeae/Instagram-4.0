import React from "react";
import Avatar from "../UI/Avatar/Avatar";
import calculateTimeAgo from "../../utils/calculateTimeAgo";
import useRedirect from "../../hooks/useRedirect";

const PostHeader: React.FC<{
    userId: string;
    avatar: string | undefined | null;
    username: string;
    time: Date | undefined;
}> = ({ userId, avatar, username, time }) => {
    // calculate time:
    const timeAgo = calculateTimeAgo(time);

    const gotoProfilePage = useRedirect().gotoProfilePage;

    return (
        <div className="flex items-center pl-1 pb-3">
            <Avatar avatarUrl={avatar} className="w-8 h-8" />

            <div className="flex items-center ml-3 mb-[2px] text-sm leading-[18px]">
                <span
                    className="font-semibold cursor-pointer"
                    onClick={() => {
                        gotoProfilePage(userId);
                    }}
                >
                    {username}
                </span>
                <span className="mx-[4px] text-textGray ">•</span>
                <span className="text-textGray">{timeAgo}</span>
            </div>
        </div>
    );
};

export default PostHeader;
