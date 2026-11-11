import { useState } from 'react';
import { Post } from '../models/Post';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { postsListActions } from '../lib/redux/postsListSlice';
import { postDetailModalActions } from '../lib/redux/postDetailModalSlice';
export default function PostManagement({ post }: {
    post: Post;
}) {
    const owner = useAppSelector(s => s.authSlice.userInfo?._id), dispatch = useAppDispatch(), http = usePrivateHttp();
    const [editing, setEditing] = useState(false), [caption, setCaption] = useState(post.caption), [error, setError] = useState('');
    if (owner !== post.userId._id)
        return null;
    async function save() { try {
        const r = await http.patch('/post/' + post._id, { content: caption });
        dispatch(postsListActions.updatePost(r.data.post));
        window.dispatchEvent(new CustomEvent("post-updated", { detail: r.data.post }));
        setEditing(false);
    }
    catch {
        setError('Unable to edit post');
    } }
    async function remove() { if (!confirm('Delete this post?'))
        return; try {
        await http.delete('/post/' + post._id);
        dispatch(postsListActions.deletePost(post._id));
        dispatch(postDetailModalActions.closePostDetailModal());
        window.dispatchEvent(new CustomEvent("post-deleted", { detail: post._id }));
    }
    catch {
        setError('Unable to delete post');
    } }
    return <div className="text-white text-xs flex gap-3 px-4 py-2">{editing ? <><input aria-label="Edit caption" value={caption} maxLength={2200} onChange={e => setCaption(e.target.value)} className="bg-dark border p-1"/><button onClick={save}>Save changes</button><button onClick={() => setEditing(false)}>Cancel</button></> : <button onClick={() => setEditing(true)}>Edit post</button>}<button onClick={remove}>Delete post</button>{error && <p role="alert">{error}</p>}</div>;
}
