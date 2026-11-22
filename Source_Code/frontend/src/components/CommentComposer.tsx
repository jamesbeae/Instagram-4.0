import { useEffect, useRef, useState } from 'react';
import Button from './UI/Button/Button';
import { useUnsavedChanges } from './UnsavedChanges';
import EmojiPicker from './UI/EmojiPicker';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { postsListActions } from '../lib/redux/postsListSlice';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import LoginPromptModal from './LoginPromptModal';

export default function CommentComposer({ postId, postData, onCreated, emoji = false, parentCommentId }: {
    postId: string; postData?: Post; onCreated?: (comment: Comment) => void; emoji?: boolean; parentCommentId?: string;
}) {
    const http = usePrivateHttp(), dispatch = useAppDispatch();
    const feedPost = useAppSelector(state => state.postsListSlice.find(post => post._id === postId));
    const userId = useAppSelector(state => state.authSlice.userInfo?._id);
    const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [loginPrompt, setLoginPrompt] = useState(false);
    const sending = useRef(false), textareaRef = useRef<HTMLTextAreaElement>(null);
    const { markSaved } = useUnsavedChanges(text !== '', () => setText(''));
    useEffect(() => {
        const input = textareaRef.current;
        if (!input) return;
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
        input.style.overflowY = input.scrollHeight > 120 ? 'auto' : 'hidden';
    }, [text]);
    const publish = (post: Post) => {
        dispatch(postsListActions.updatePost(post));
        window.dispatchEvent(new CustomEvent('post-updated', { detail: post }));
    };
    async function send() {
        const content = text.trim();
        if (!content || sending.current) return;
        sending.current = true; setBusy(true); setError('');
        try {
            const response = await http.post('/comment/create-comment', { postId, content, ...(parentCommentId ? { parentCommentId } : {}) });
            const comment: Comment = response.data.comment;
            if (!comment?._id) throw new Error('Missing saved comment');
            markSaved();
            setText('');
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
    if (!userId) return <div className="my-2"> <Button type="button" className="text-blue text-sm" onClick={() => setLoginPrompt(true)}>Log in to comment</Button>{loginPrompt && <LoginPromptModal onClose={() => setLoginPrompt(false)} />}</div>;
    return <div className="comment-composer relative my-2 rounded-xl border border-lightSecondDark px-3 py-2 focus-within:border-textGray">
        <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); void send(); }}>
            {emoji && <EmojiPicker disabled={busy} onSelect={icon => {
                setText(value => value.length + icon.length <= 2200 ? value + icon : value);
                setError('');
            }} />}
            <textarea ref={textareaRef} id={emoji ? 'comment' : undefined} aria-label="Add a comment" placeholder="Add a comment" rows={1} maxLength={2200}
                value={text} disabled={busy} onChange={event => { setText(event.target.value); setError(''); }}
                onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
                }} className="bg-transparent text-foreground text-sm flex-1 min-w-0 min-h-[24px] max-h-[120px] resize-none overflow-hidden py-1 leading-6 focus:outline-none" />
            <Button type="submit" disabled={!text.trim() || busy} className="shrink-0 self-center px-1 text-blue text-sm font-semibold disabled:opacity-50">{busy ? 'Posting…' : 'Post'}</Button>
        </form>
        {error && <p role="alert" className="text-errorText text-xs mt-1">{error}</p>}
    </div>;
}
