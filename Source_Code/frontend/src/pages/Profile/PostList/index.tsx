import { useState } from 'react';
import OptionGroup from '../../../components/UI/OptionGroup';
import type { Post } from '../../../models/Post';
import ProfilePostGrid from './ProfilePostGrid';

const options = [{ id: 'posts', label: 'Posts' }, { id: 'reels', label: 'Reels' }, { id: 'saved', label: 'Saved' }] as const;

export default function ProfilePostList({ posts, reels = [], saved, canViewSaved }: { posts: Post[]; reels?: Post[]; saved: Post[]; canViewSaved: boolean }) {
    const [selection, setSelection] = useState<typeof options[number]['id']>('posts');
    const viewingSaved = canViewSaved && selection === 'saved';
    const visiblePosts = viewingSaved ? saved : selection === 'reels' ? reels : posts;

    return (
        <section className="profile-collection" aria-label="Profile posts">
            <div className="profile-tabs"><OptionGroup label="Profile collection" options={canViewSaved ? options : options.filter(option => option.id !== 'saved')} value={selection === 'saved' && !canViewSaved ? 'posts' : selection} onChange={value => setSelection(value)} /></div>
            <ProfilePostGrid posts={visiblePosts} emptyMessage={viewingSaved ? 'No saved posts yet.' : selection === 'reels' ? 'No Reels yet.' : 'No posts yet.'} />
        </section>
    );
}
