import { useContext } from 'react';
import { CommentListContext } from '..';
import CommentComposer from '../../../CommentComposer';
import { Post } from '../../../../models/Post';

export default function PostComment({ postId, postData }: { postId: string; postData: Post }) {
    const { commentListDispatch } = useContext(CommentListContext);
    return <CommentComposer postId={postId} postData={postData} emoji onCreated={comment => commentListDispatch({ type: 'ADD_COMMENT', payload: comment })} />;
}
