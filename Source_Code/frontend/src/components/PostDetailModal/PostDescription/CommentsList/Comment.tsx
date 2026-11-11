import React from "react";
import Avatar from "../../../UI/Avatar/Avatar";
import { Comment as CommentModel } from "../../../../models/Comment";
import calculateTimeAgo from "../../../../utils/calculateTimeAgo";
import split1000 from "../../../../utils/split1000";
import LikeIcon from "../../../UI/Icons/LikeIcon";

const Comment: React.FC<{ commentData: CommentModel }> = ({ commentData }) => {

    return (
        <div className="flex pt-3">
            <Avatar
                className="w-[32px] h-[32px] mr-[18px] shrink-0"
                username={commentData.userId.username}
                avatarUrl={commentData.userId.avatar}
            />
            <div className="flex flex-col flex-1 min-w-0">
                <div className="text-white text-sm flex-1">
                    <span className=" font-semibold cursor-pointer mr-1">
                        {commentData.userId.username}
                    </span>
                    <span className="whitespace-pre-wrap break-words">{commentData.content}</span>
                </div>
                <div className="flex gap-3 mt-[4px] text-textSecondGray text-xs">
                    <div>{calculateTimeAgo(commentData.createdAt)}</div>
                    {commentData.likes.length > 0 && (
                        <div className="font-semibold cursor-pointer">
                            {split1000(commentData.likes.length)} likes
                        </div>
                    )}
                    <div className="font-semibold cursor-pointer">Reply</div>
                </div>
            </div>
            <div className="pt-2 cursor-pointer">
                <LikeIcon height={12} width={12} />
            </div>
        </div>
    );
};

export default Comment;
