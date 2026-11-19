import type { Post } from '../../../models/Post';
import ProfilePost from './ProfilePost';

export default function ProfilePostGrid({ posts, emptyMessage }: { posts: Post[]; emptyMessage: string }) {
    return (
        <div className="profile-post-grid">
            {posts.length ? posts.map(post => <ProfilePost key={post._id} post={post} />) : (
                <p className="profile-empty">{emptyMessage}</p>
            )}
        </div>
    );
}
