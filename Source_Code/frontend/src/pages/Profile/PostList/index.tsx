import { useState } from 'react';
import OptionGroup from '../../../components/UI/OptionGroup';
import { Post } from '../../../models/Post';
import ProfilePostGrid from './ProfilePostGrid';

const options = [{ id: 'posts', label: 'POSTS' }, { id: 'saved', label: 'SAVED' }] as const;

export default function ProfilePostList({ posts, saved }: { posts: Post[]; saved: Post[] }) {
    const [activeTab, setActiveTab] = useState<typeof options[number]['id']>('posts');
    return (
        <div className="mt-16">
            <div className="border-t border-gray-400 dark:border-textGray text-white text-xs">
                <OptionGroup label="Profile posts" options={options} value={activeTab} onChange={setActiveTab} variant="underline" />
            </div>
            <ProfilePostGrid posts={activeTab === 'posts' ? posts : saved} />
        </div>
    );
}
