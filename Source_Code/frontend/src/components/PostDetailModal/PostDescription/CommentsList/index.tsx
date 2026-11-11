import { useContext, useEffect, useState } from 'react';
import Avatar from '../../../UI/Avatar/Avatar';
import { Post } from '../../../../models/Post';
import Comment from './Comment';
import usePrivateHttp from '../../../../hooks/usePrivateHttp';
import { CommentListContext } from '..';

export default function CommentsList({ postData }: { postData: Post }) {
    const http = usePrivateHttp();
    const { commentListState, commentListDispatch } = useContext(CommentListContext);
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        http.get('/comment/get-comments', { params: { postId: postData._id } })
            .then(response => { if (active) commentListDispatch({ type: 'SET_COMMENTS', payload: response.data.comments }); })
            .catch(() => { if (active) setError('Unable to load comments. Please reopen the post to try again.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [postData._id, http, commentListDispatch]);
    return <section aria-label="Comments" className="absolute inset-0 p-4 border-l border-b border-lightDark overflow-y-auto">
        <div className="flex items-start pb-4">
            <Avatar avatarUrl={postData.userId.avatar} username={postData.userId.username} className="w-8 h-8 mr-4 shrink-0" />
            <p className="text-white text-sm break-words min-w-0"><span className="font-semibold mr-1">{postData.userId.username}</span>{postData.caption}</p>
        </div>
        {commentListState.commentsList.map(comment => <Comment key={comment._id} commentData={comment} />)}
        {loading && <p role="status" className="text-textGray text-sm">Loading comments…</p>}
        {error && <p role="alert" className="text-errorText text-sm">{error}</p>}
        {!loading && !error && !commentListState.commentsList.length && <p className="text-textGray text-sm">No comments yet.</p>}
    </section>;
}
