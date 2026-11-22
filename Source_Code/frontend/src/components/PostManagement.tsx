import { useEffect, useId, useRef, useState } from 'react';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Post } from '../models/Post';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { postsListActions } from '../lib/redux/postsListSlice';
import { postDetailModalActions } from '../lib/redux/postDetailModalSlice';
import Button from './UI/Button/Button';
import Card from './UI/Card';
import { useUnsavedChanges } from './UnsavedChanges';

export default function PostManagement({ post }: { post: Post }) {
    const owner = useAppSelector(state => state.authSlice.userInfo?._id);
    const dispatch = useAppDispatch();
    const http = usePrivateHttp();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [caption, setCaption] = useState(post.caption);
    const [visibility, setVisibility] = useState<Post['visibility']>(post.visibility || 'public');
    const [groupId, setGroupId] = useState(post.groupId || '');
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const optionsId = useId();
    const hasUnsavedChanges = caption !== post.caption
        || (visibility || 'public') !== (post.visibility || 'public')
        || (visibility === 'group' && groupId !== (post.groupId || ''));
    const { markSaved, requestExit } = useUnsavedChanges(owner === post.userId._id && editing && hasUnsavedChanges, closeEditor);

    useEffect(() => {
        if (!open) return;

        function dismissOnOutsideClick(event: PointerEvent) {
            if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
        }

        document.addEventListener('pointerdown', dismissOnOutsideClick);
        return () => document.removeEventListener('pointerdown', dismissOnOutsideClick);
    }, [open]);

    useEffect(() => {
        if (!editing) return;
        http.get('/groups').then(response => setGroups(response.data.groups || [])).catch(() => setError('Unable to load relation lists'));
    }, [editing, http]);

    if (owner !== post.userId._id) return null;

    function closeEditor() {
        setEditing(false);
        setError('');
        trigger.current?.focus();
    }

    async function save() {
        setBusy(true);
        setError('');
        try {
            const response = await http.patch('/post/' + post._id, { content: caption, visibility, groupId: visibility === 'group' ? groupId : null });
            dispatch(postsListActions.updatePost(response.data.post));
            window.dispatchEvent(new CustomEvent('post-updated', { detail: response.data.post }));
            markSaved();
            closeEditor();
        } catch {
            setError('Unable to edit post');
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        setOpen(false);
        trigger.current?.focus();
        if (!confirm('Delete this post?')) return;

        setBusy(true);
        setError('');
        try {
            await http.delete('/post/' + post._id);
            dispatch(postsListActions.deletePost(post._id));
            dispatch(postDetailModalActions.closePostDetailModal());
            window.dispatchEvent(new CustomEvent('post-deleted', { detail: post._id }));
        } catch {
            setError('Unable to delete post');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="relative shrink-0 text-sm" ref={root}
            onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
            onKeyDown={event => {
                if (event.key !== 'Escape' || (!open && !editing)) return;
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                if (editing && !busy) requestExit(closeEditor);
                if (open) trigger.current?.focus();
            }}>
            <Button ref={trigger} className="post-detail-icon-button" aria-label="Post options"
                aria-expanded={open || editing} aria-controls={open || editing ? optionsId : undefined}
                aria-disabled={busy || undefined}
                onClick={() => {
                    if (busy) return;
                    if (editing) {
                        requestExit(closeEditor);
                        return;
                    }
                    setError('');
                    setOpen(value => !value);
                }}>
                <FontAwesomeIcon icon={faEllipsis} />
            </Button>
            {open && <Card id={optionsId} className="absolute right-0 top-full z-30 mt-2 flex w-40 flex-col gap-1 p-1.5 shadow-lg">
                <Button className="rounded-xl px-3 py-2 text-left hover:bg-lightDark"
                    onClick={() => {
                        setOpen(false);
                        setCaption(post.caption);
                        setVisibility(post.visibility || 'public');
                        setGroupId(post.groupId || '');
                        setEditing(true);
                    }}>
                    Edit post
                </Button>
                <Button className="rounded-xl px-3 py-2 text-left text-red-400 hover:bg-lightDark" onClick={remove}>
                    Delete post
                </Button>
            </Card>}
            {editing && <Card id={optionsId} className="absolute right-0 top-full z-30 mt-2 w-[min(17rem,calc(100vw-3rem))] p-3 shadow-lg">
                <form className="flex flex-col gap-3" onSubmit={event => {
                    event.preventDefault();
                    if (!busy) void save();
                }}>
                    <label htmlFor={optionsId + '-caption'} className="font-semibold">Edit caption</label>
                    <textarea id={optionsId + '-caption'} autoFocus value={caption} maxLength={2200}
                        disabled={busy} rows={3} onChange={event => setCaption(event.target.value)}
                        className="w-full resize-y rounded-lg border border-lightSecondDark bg-dark p-2" />
                    <label htmlFor={optionsId + '-visibility'} className="font-semibold">Who can see this post?</label>
                    <select id={optionsId + '-visibility'} value={visibility || 'public'} disabled={busy} onChange={event => setVisibility(event.target.value as Post['visibility'])} className="rounded-lg border border-lightSecondDark bg-dark p-2">
                        <option value="public">Public</option><option value="followers">Followers</option><option value="group">Relation list</option>
                    </select>
                    {visibility === 'group' && <select aria-label="Relation list" value={groupId} disabled={busy} onChange={event => setGroupId(event.target.value)} className="rounded-lg border border-lightSecondDark bg-dark p-2">
                        <option value="">Choose a list</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>}
                    {error && <p role="alert" className="text-red-400">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <Button disabled={busy} onClick={() => requestExit(closeEditor)}>Cancel</Button>
                        <Button type="submit" disabled={busy || (visibility === 'group' && !groupId)} className="font-semibold text-blue">Save changes</Button>
                    </div>
                </form>
            </Card>}
            {error && !editing && <Card role="alert" className="absolute right-0 top-full z-30 mt-2 w-48 p-2 text-red-400">{error}</Card>}
        </div>
    );
}
