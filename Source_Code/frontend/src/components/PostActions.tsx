import { useEffect, useState } from 'react';
import { Post } from '../models/Post';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import usePrivateHttp from '../hooks/usePrivateHttp';
import LikeIcon from './UI/Icons/LikeIcon';
import LikedIcon from './UI/Icons/LikedIcon';
import CommentIcon from './UI/Icons/CommentIcon';
import SaveIcon from './UI/Icons/SaveIcon';
import SharePostIcon from './UI/Icons/SharePostIcon';
import { postsListActions } from '../lib/redux/postsListSlice';
export default function PostActions({ post, onComment }: {
    post: Post;
    onComment?: () => void;
}) {
    const http = usePrivateHttp();
    const dispatch = useAppDispatch();
    const userId = useAppSelector(s => s.authSlice.userInfo?._id);
    const [liked, setLiked] = useState(false), [count, setCount] = useState(post.likes.length), [saved, setSaved] = useState(!!post.isSaved), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => { setLiked(post.likes.some(l => l.userId === userId)); setCount(post.likes.length); setSaved(!!post.isSaved); }, [post, userId]);
    async function like() {
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            if (liked)
                await http.delete('/like/delete-like-post', { data: { postId: post._id } });
            else
                await http.post('/like/create-like-post', { postId: post._id });
            const res = await http.get('/post/' + post._id);
            dispatch(postsListActions.updatePost(res.data.post));
            window.dispatchEvent(new CustomEvent("post-updated", { detail: res.data.post }));
            setLiked(!liked);
            setCount(n => n + (liked ? -1 : 1));
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
    async function report() { const reason = prompt('Why are you reporting this post?'); if (!reason)
        return; try {
        await http.post('/reports', { postId: post._id, reason });
        setError('Report submitted');
    }
    catch {
        setError('Unable to submit report');
    } }
    async function share() { try {
        const url = location.origin + '/post/' + post._id;
        await navigator.clipboard.writeText(url);
        await http.post('/post/' + post._id + '/interaction', { type: 'SHARE' });
        setError('Link copied');
    }
    catch {
        setError('Unable to copy link');
    } }
    return <div><div className="flex items-center gap-3 py-2">
  <button type="button" aria-label={liked ? 'Unlike post' : 'Like post'} aria-pressed={liked} disabled={busy} onClick={like}>{liked ? <LikedIcon /> : <LikeIcon />}</button>
  <button type="button" aria-label="View comments" onClick={onComment}><CommentIcon /></button>
  <button type="button" aria-label="Share post" onClick={share}><SharePostIcon /></button>
  <button type="button" aria-label={saved ? 'Unsave post' : 'Save post'} aria-pressed={saved} disabled={busy} onClick={save} className="ml-auto"><SaveIcon />{saved && <span className="text-xs">Saved</span>}</button>
  <button type="button" aria-label="Report post" onClick={report} className="text-xs">Report</button>
 </div><p className="text-sm font-semibold">{count} {count === 1 ? 'like' : 'likes'}</p>{error && <p role="status" className="text-xs text-red-400">{error}</p>}</div>;
}
