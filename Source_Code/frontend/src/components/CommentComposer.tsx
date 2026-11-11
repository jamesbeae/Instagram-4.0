import { useRef, useState } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { postsListActions } from '../lib/redux/postsListSlice';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';

export default function CommentComposer({ postId, postData, onCreated, emoji = false }: {
    postId: string; postData?: Post; onCreated?: (comment: Comment) => void; emoji?: boolean;
}) {
    const http = usePrivateHttp(), dispatch = useAppDispatch();
    const feedPost = useAppSelector(state => state.postsListSlice.find(post => post._id === postId));
    const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [picker, setPicker] = useState(false);
    const sending = useRef(false);
    const publish = (post: Post) => {
        dispatch(postsListActions.updatePost(post));
        window.dispatchEvent(new CustomEvent('post-updated', { detail: post }));
    };
    async function send() {
        const content = text.trim();
        if (!content || sending.current) return;
        sending.current = true; setBusy(true); setError('');
        try {
            const response = await http.post('/comment/create-comment', { postId, content });
            const comment: Comment = response.data.comment;
            if (!comment?._id) throw new Error('Missing saved comment');
            setText(''); setPicker(false);
            onCreated?.(comment);
            const base = feedPost || postData;
            if (base) publish({ ...base, comments: [...base.comments.filter(c => c._id !== comment._id), comment] });
            // The comment is already committed. A refresh failure must never invite a duplicate submission.
            void http.get('/post/' + postId).then(result => {
                if (result.data.post?.comments.some((c: Comment) => c._id === comment._id)) publish(result.data.post);
            }).catch(() => {});
        } catch (e: any) {
            setError([403, 404].includes(e.response?.status)
                ? 'This post is no longer available or you do not have permission to comment.'
                : 'Unable to post comment. Your draft is kept; please try again.');
        } finally { sending.current = false; setBusy(false); }
    }
    return <div className="relative px-4 py-2 border-lightDark">
        <form className="flex gap-3 items-center" onSubmit={event => { event.preventDefault(); void send(); }}>
            {emoji && <button type="button" aria-label="Choose emoji" aria-expanded={picker} disabled={busy} onClick={() => setPicker(value => !value)} className="text-white text-xl">☺</button>}
            <textarea id={emoji ? 'comment' : undefined} aria-label="Add a comment" placeholder="Add a comment" rows={2} maxLength={2200}
                value={text} disabled={busy} onChange={event => { setText(event.target.value); setError(''); }}
                onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
                }} className="bg-transparent text-white text-sm flex-1 min-w-0 min-h-[40px] max-h-[120px] resize-y focus:outline-none" />
            <button type="submit" disabled={!text.trim() || busy} className="text-blue text-sm font-semibold disabled:opacity-50">{busy ? 'Posting…' : 'Post'}</button>
        </form>
        {picker && <div className="absolute bottom-full left-0 z-20"><Picker data={data} maxFrequentRows={0} onEmojiSelect={(item: { native: string }) => setText(value => (value + item.native).slice(0, 2200))} /></div>}
        {error && <p role="alert" className="text-errorText text-xs mt-1">{error}</p>}
    </div>;
}
