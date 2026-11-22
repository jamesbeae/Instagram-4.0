import React, { useEffect, useState } from 'react';
import Avatar from '../../../UI/Avatar/Avatar';
import { Comment as CommentModel } from '../../../../models/Comment';
import calculateTimeAgo from '../../../../utils/calculateTimeAgo';
import split1000 from '../../../../utils/split1000';
import LikeIcon from '../../../UI/Icons/LikeIcon';
import LikedIcon from '../../../UI/Icons/LikedIcon';
import usePrivateHttp from '../../../../hooks/usePrivateHttp';
import { useAppSelector } from '../../../../hooks/useStore';
import LoginPromptModal from '../../../LoginPromptModal';

const Comment: React.FC<{ commentData: CommentModel; onReply: () => void }> = ({ commentData, onReply }) => {
    const http = usePrivateHttp();
    const userId = useAppSelector(state => state.authSlice.userInfo?._id);
    const [likes, setLikes] = useState(commentData.likes || []);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [loginPrompt, setLoginPrompt] = useState(false);
    const liked = !!userId && likes.some(like => like.userId === userId);

    useEffect(() => setLikes(commentData.likes || []), [commentData.likes]);

    async function toggleLike() {
        if (!userId) { setLoginPrompt(true); return; }
        if (busy) return;
        setBusy(true); setError('');
        const previous = likes;
        setLikes(liked ? previous.filter(like => like.userId !== userId) : [...previous, { _id: `pending-${commentData._id}`, userId, commentId: commentData._id }]);
        try {
            if (liked) await http.delete(`/comment/${commentData._id}/like`);
            else await http.post(`/comment/${commentData._id}/like`);
        } catch (reason: any) {
            setLikes(previous);
            setError(reason?.response?.data?.message || 'Unable to update comment like. Please try again.');
        } finally { setBusy(false); }
    }

    return <>
        <div className="flex pt-3">
            <Avatar className="mr-3 h-8 w-8 shrink-0" username={commentData.userId.username} avatarUrl={commentData.userId.avatar} />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 break-words text-sm text-foreground">
                    <span className="mr-1 cursor-pointer font-semibold">{commentData.userId.username}</span>
                    <span className="whitespace-pre-wrap break-words">{commentData.content}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-textSecondGray">
                    <span>{calculateTimeAgo(commentData.createdAt)}</span>
                    {likes.length > 0 && <span className="font-semibold">{split1000(likes.length)} likes</span>}
                    <button type="button" onClick={onReply} className="font-semibold hover:text-foreground">Reply</button>
                </div>
                {error && <p role="alert" className="mt-1 text-xs text-errorText">{error}</p>}
            </div>
            <button type="button" aria-label={liked ? 'Unlike comment' : 'Like comment'} aria-pressed={liked} disabled={busy} onClick={() => void toggleLike()} className="ml-2 mt-1 shrink-0 disabled:opacity-50">
                {liked ? <LikedIcon height={12} width={12} /> : <LikeIcon height={12} width={12} />}
            </button>
        </div>
        {loginPrompt && <LoginPromptModal onClose={() => setLoginPrompt(false)} />}
    </>;
};

export default Comment;
