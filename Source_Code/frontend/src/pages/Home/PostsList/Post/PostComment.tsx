import CommentComposer from '../../../../components/CommentComposer';
export default function PostComment({ postId }: { postId: string }) {
    return <CommentComposer postId={postId} />;
}
