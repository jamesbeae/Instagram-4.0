import Loading from "../../../UI/Loading";
import { useContext, useEffect, useMemo, useState } from 'react';
import Avatar from '../../../UI/Avatar/Avatar';
import { Post } from '../../../../models/Post';
import type { Comment as CommentModel } from '../../../../models/Comment';
import Comment from './Comment';
import usePrivateHttp from '../../../../hooks/usePrivateHttp';
import { CommentListContext } from '..';
import CommentComposer from '../../../CommentComposer';
import Button from '../../../UI/Button/Button';

export default function CommentsList({ postData }: { postData: Post }) {
    const http = usePrivateHttp();
    const { commentListState, commentListDispatch } = useContext(CommentListContext);
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const threadComments = useMemo(() => {
        const children = new Map<string, CommentModel[]>();
        const roots: CommentModel[] = [];
        for (const comment of commentListState.commentsList) {
            if (comment.parentCommentId) children.set(comment.parentCommentId, [...(children.get(comment.parentCommentId) || []), comment]);
            else roots.push(comment);
        }
        const ordered: { comment: CommentModel; depth: number }[] = [];
        const visited = new Set<string>();
        const append = (comment: CommentModel, depth: number) => {
            if (visited.has(comment._id)) return;
            visited.add(comment._id);
            ordered.push({ comment, depth });
            (children.get(comment._id) || []).forEach(child => append(child, depth + 1));
        };
        roots.forEach(comment => append(comment, 0));
        commentListState.commentsList.forEach(comment => append(comment, 0));
        return ordered;
    }, [commentListState.commentsList]);
    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        http.get('/comment/get-comments', { params: { postId: postData._id } })
            .then(response => { if (active) commentListDispatch({ type: 'SET_COMMENTS', payload: response.data.comments }); })
            .catch(() => { if (active) setError('Unable to load comments. Please reopen the post to try again.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [postData._id, http, commentListDispatch]);
    return <section aria-label="Comments" className="post-detail-comments absolute inset-0 p-4 overflow-y-auto">
        <div className="flex items-start pb-4">
            <Avatar avatarUrl={postData.userId.avatar} username={postData.userId.username} className="w-8 h-8 mr-4 shrink-0" />
            <p className="text-foreground text-sm break-words min-w-0"><span className="font-semibold mr-1">{postData.userId.username}</span>{postData.caption}</p>
        </div>
        {threadComments.map(({ comment, depth }) => <div key={comment._id} className={depth ? 'border-l border-lightDark pl-3' : ''} style={depth ? { marginLeft: `${Math.min(depth, 3) * 24}px` } : undefined}>
            <Comment commentData={comment} onReply={() => setReplyTo(current => current === comment._id ? null : comment._id)} />
            {replyTo === comment._id && <div className="ml-10">
                <CommentComposer postId={postData._id} postData={postData} parentCommentId={comment._id} onCreated={reply => { commentListDispatch({ type: 'ADD_COMMENT', payload: reply }); setReplyTo(null); }} />
                <Button type="button" onClick={() => setReplyTo(null)} className="text-xs text-textSecondGray">Cancel reply</Button>
            </div>}
        </div>)}
        {loading && <Loading message="Loading comments…" align="start" className="text-textSecondGray" />}
        {error && <p role="alert" className="text-errorText text-sm">{error}</p>}
        {!loading && !error && !commentListState.commentsList.length && <p className="text-textGray text-sm">No comments yet.</p>}
    </section>;
}
