import { useEffect, useState } from 'react';
import { Post } from '../models/Post';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import usePrivateHttp from '../hooks/usePrivateHttp';
import LikeIcon from './UI/Icons/LikeIcon';
import LikedIcon from './UI/Icons/LikedIcon';
import CommentIcon from './UI/Icons/CommentIcon';
import SaveIcon from './UI/Icons/SaveIcon';
import SharePostIcon from './UI/Icons/SharePostIcon';
import ReportPostDialog from './ReportPostDialog';
import { postsListActions } from '../lib/redux/postsListSlice';
import LoginPromptModal from './LoginPromptModal';
export default function PostActions({ post, onComment, vertical = false }: {
    post: Post;
    onComment?: () => void;
    vertical?: boolean;
}) {
    const http = usePrivateHttp();
    const dispatch = useAppDispatch();
    const userId = useAppSelector(s => s.authSlice.userInfo?._id);
    const [liked, setLiked] = useState(false), [count, setCount] = useState(post.likes.length), [saved, setSaved] = useState(!!post.isSaved), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [reportOpen, setReportOpen] = useState(false), [loginPrompt, setLoginPrompt] = useState(false);
    useEffect(() => { setLiked(post.likes.some(l => l.userId === userId)); setCount(post.likes.length); setSaved(!!post.isSaved); }, [post, userId]);
    if (!userId) return <><div className={`post-actions ${vertical ? 'post-actions-vertical' : ''} flex items-center gap-3 py-2 text-sm`}>
        <button type="button" aria-label="Like post" onClick={() => setLoginPrompt(true)}><LikeIcon />{vertical && <span>{count}</span>}</button>
        <button type="button" aria-label="View comments" onClick={onComment}><CommentIcon />{vertical && <span>{post.comments.length}</span>}</button>
        <button type="button" aria-label="Share post" onClick={() => setLoginPrompt(true)}><SharePostIcon />{vertical && <span>Share</span>}</button>
        <button type="button" aria-label="Save post" className="ml-auto" onClick={() => setLoginPrompt(true)}><SaveIcon />{vertical && <span>Save</span>}</button>
        <button type="button" onClick={() => setLoginPrompt(true)} className="text-xs">Report</button>
        {!vertical && <span>{count} {count === 1 ? 'like' : 'likes'}</span>}
    </div>{loginPrompt && <LoginPromptModal onClose={() => setLoginPrompt(false)} />}</>;
    async function like() {
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            const wasLiked = liked;
            if (wasLiked)
                await http.delete('/like/delete-like-post', { data: { postId: post._id } });
            else
                await http.post('/like/create-like-post', { postId: post._id });
            const nextLiked = !wasLiked;
            const optimisticPost = {
                ...post,
                likes: wasLiked
                    ? post.likes.filter(like => like.userId !== userId)
                    : [...post.likes, { _id: `local-${Date.now()}`, userId: userId || '', postId: post._id }],
            };
            dispatch(postsListActions.updatePost(optimisticPost));
            window.dispatchEvent(new CustomEvent("post-updated", { detail: optimisticPost }));
            setLiked(nextLiked);
            setCount(optimisticPost.likes.length);
            try {
                const res = await http.get('/post/' + post._id);
                dispatch(postsListActions.updatePost(res.data.post));
                window.dispatchEvent(new CustomEvent("post-updated", { detail: res.data.post }));
            }
            catch {
                // The like request already succeeded; a failed refresh must not
                // tell the user that the saved action failed.
            }
        }
        catch {
            setError('Unable to update like. Please try again.');
        }
        finally {
            setBusy(false);
        }
    }
    async function save() {
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            await http[saved ? 'delete' : 'post']('/post/' + post._id + '/save');
            setSaved(!saved);
            dispatch(postsListActions.updatePost({ ...post, isSaved: !saved }));
        }
        catch {
            setError('Unable to save post. Please try again.');
        }
        finally {
            setBusy(false);
        }
    }
    async function share() { try {
        const url = location.origin + '/post/' + post._id;
        await navigator.clipboard.writeText(url);
        await http.post('/post/' + post._id + '/interaction', { type: 'SHARE' });
        setError('Link copied');
    }
    catch {
        setError('Unable to copy link');
    } }
    return <div><div className={`post-actions flex items-center gap-3 py-2 ${vertical ? 'post-actions-vertical' : ''}`}>
  <button type="button" aria-label={liked ? 'Unlike post' : 'Like post'} aria-pressed={liked} disabled={busy} onClick={like}>{liked ? <LikedIcon /> : <LikeIcon />}{vertical && <span>{count}</span>}</button>
  <button type="button" aria-label="View comments" onClick={onComment}><CommentIcon />{vertical && <span>{post.comments.length}</span>}</button>
  <button type="button" aria-label="Share post" onClick={share}><SharePostIcon />{vertical && <span>Share</span>}</button>
  <button type="button" aria-label={saved ? 'Unsave post' : 'Save post'} aria-pressed={saved} disabled={busy} onClick={save} className={`ml-auto ${saved ? 'text-white' : ''}`}><SaveIcon saved={saved} />{vertical && <span>Save</span>}</button>
  <button type="button" aria-label="Report post" onClick={() => setReportOpen(true)} className="text-xs">Report</button>
 </div><p className="text-sm font-semibold">{count} {count === 1 ? 'like' : 'likes'}</p>{error && <p role="status" className="text-xs text-red-400">{error}</p>}{reportOpen && <ReportPostDialog postId={post._id} onClose={() => setReportOpen(false)}
     onSubmitted={duplicate => setError(duplicate ? 'A report for this item is already awaiting review.' : 'Report submitted and awaiting review.')} />}</div>;
}
