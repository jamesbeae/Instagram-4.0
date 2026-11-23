import { useState } from 'react';
import OptionGroup from '../../../components/UI/OptionGroup';
import type { Post } from '../../../models/Post';
import ProfilePostGrid from './ProfilePostGrid';

const options = [{ id: 'posts', label: 'Posts' }, { id: 'saved', label: 'Saved' }] as const;

export default function ProfilePostList({ posts, saved, canViewSaved }: { posts: Post[]; saved: Post[]; canViewSaved: boolean }) {
    const [selection, setSelection] = useState<typeof options[number]['id']>('posts');
    const viewingSaved = canViewSaved && selection === 'saved';

    return (
        <section className="profile-collection" aria-label="Profile posts">
            <div className="profile-tabs">
                {canViewSaved ? <OptionGroup label="Profile collection" options={options} value={selection} onChange={setSelection} /> : <h2>Posts</h2>}
            </div>
            <ProfilePostGrid posts={viewingSaved ? saved : posts} emptyMessage={viewingSaved ? 'No saved posts yet.' : 'No posts yet.'} />
        </section>
    );
}
