import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { Post } from '../models/Post';
import type { Comment as CommentModel } from '../models/Comment';
import usePrivateHttp from '../hooks/usePrivateHttp';
import Button from '../components/UI/Button/Button';
import Loading from '../components/UI/Loading';
import Comment from '../components/PostDetailModal/PostDescription/CommentsList/Comment';
import CommentComposer from '../components/CommentComposer';

export default function ReelCommentsPanel({ post, onClose, compact }: { post: Post; onClose: () => void; compact: boolean }) {
    const http = usePrivateHttp();
    const [comments, setComments] = useState<CommentModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [expandedReplies, setExpandedReplies] = useState<Record<string, number>>({});

    const loadComments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await http.get('/comment/get-comments', { params: { postId: post._id } });
            setComments(response.data.comments || []);
        } catch {
            setError('Unable to load comments. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [http, post._id]);

    useEffect(() => { void loadComments(); }, [loadComments]);

    const { roots, repliesByParent } = useMemo(() => {
        const children = new Map<string, CommentModel[]>();
        const commentIds = new Set(comments.map(comment => comment._id));
        const roots = comments.filter(comment => !comment.parentCommentId || !commentIds.has(comment.parentCommentId));
        for (const comment of comments) {
            if (comment.parentCommentId) children.set(comment.parentCommentId, [...(children.get(comment.parentCommentId) || []), comment]);
        }
        return { roots, repliesByParent: children };
    }, [comments]);

    function addComment(comment: CommentModel) {
        setComments(current => current.some(item => item._id === comment._id) ? current : [comment, ...current]);
        if (comment.parentCommentId) {
            const currentReplyCount = repliesByParent.get(comment.parentCommentId)?.length || 0;
            setExpandedReplies(current => ({ ...current, [comment.parentCommentId!]: Math.max(current[comment.parentCommentId!] || 0, Math.min(4, currentReplyCount + 1)) }));
        }
        setReplyTo(null);
    }

    function renderComment(comment: CommentModel, depth = 0): ReactNode {
        const replies = repliesByParent.get(comment._id) || [];
        const visibleCount = Math.min(expandedReplies[comment._id] || 0, replies.length);
        const visibleReplies = replies.slice(0, visibleCount);
        return <div key={comment._id} className={`reel-comment-thread${depth ? ' reel-comment-thread-reply' : ''}`}>
            <Comment commentData={comment} onReply={() => setReplyTo(current => current === comment._id ? null : comment._id)} />
            {replyTo === comment._id && <div className="reel-comment-reply">
                <CommentComposer postId={post._id} postData={post} parentCommentId={comment._id} onCreated={addComment} />
                <Button type="button" onClick={() => setReplyTo(null)} className="text-xs text-textSecondGray">Cancel reply</Button>
            </div>}
            {replies.length > 0 && <div className="reel-replies">
                {visibleReplies.map(reply => renderComment(reply, depth + 1))}
                <div className="reel-reply-controls">
                    {visibleCount === 0 && <Button type="button" onClick={() => setExpandedReplies(current => ({ ...current, [comment._id]: 4 }))}>
                        View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </Button>}
                    {visibleCount > 0 && visibleCount < replies.length && <Button type="button" onClick={() => setExpandedReplies(current => ({ ...current, [comment._id]: visibleCount + 4 }))}>
                        View {Math.min(4, replies.length - visibleCount)} more {replies.length - visibleCount === 1 ? 'reply' : 'replies'}
                    </Button>}
                    {visibleCount > 0 && <Button type="button" onClick={() => setExpandedReplies(current => {
                        const next = { ...current };
                        delete next[comment._id];
                        return next;
                    })}>Hide replies</Button>}
                </div>
            </div>}
        </div>;
    }

    return <aside className={`reel-comments-panel${compact ? ' reel-comments-panel-compact' : ''}`} aria-label="Reel comments">
        <header className="reel-comments-header">
            <h2>Comments <span>{comments.length}</span></h2>
            <Button type="button" className="reel-comments-close" aria-label="Close comments" onClick={onClose}>
                <FontAwesomeIcon icon={faXmark} />
            </Button>
        </header>
        <div className="reel-comments-list">
            {roots.map(comment => renderComment(comment))}
            {loading && <Loading message="Loading comments…" align="start" className="text-textSecondGray" />}
            {error && <div role="alert" className="reel-comments-error"><p>{error}</p><Button type="button" onClick={() => void loadComments()}>Try again</Button></div>}
            {!loading && !error && comments.length === 0 && <p className="reel-comments-empty">No comments yet. Start the conversation.</p>}
        </div>
        <footer className="reel-comments-compose">
            <CommentComposer postId={post._id} postData={post} onCreated={addComment} />
        </footer>
    </aside>;
}
