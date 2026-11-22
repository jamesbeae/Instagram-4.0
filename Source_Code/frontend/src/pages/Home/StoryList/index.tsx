import { useEffect, useState } from 'react';
import { Post } from '../../../models/Post';
import usePrivateHttp from '../../../hooks/usePrivateHttp';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { postDetailModalActions } from '../../../lib/redux/postDetailModalSlice';
import Avatar from '../../../components/UI/Avatar/Avatar';
import Card from '../../../components/UI/Card';
import './StoryList.css';
import { sideBarActions } from '../../../lib/redux/sideBarSlice';

export default function StoryList() {
    const http = usePrivateHttp();
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.authSlice.userInfo);
    const [stories, setStories] = useState<Post[]>([]);
    useEffect(() => {
        const load = () => http.get('/post/stories').then(r => setStories(r.data.postsList)).catch(() => {});
        load();
        window.addEventListener('stories-updated', load);
        return () => window.removeEventListener('stories-updated', load);
    }, [http]);
<<<<<<< Updated upstream
    if (!stories.length) return null;
    return <Card as="section" className="feed-card story-strip mt-4" aria-label="Stories">
=======
    return <section className="story-strip" aria-label="Stories">
        <button type="button" className="story-item story-create" onClick={() => dispatch(sideBarActions.openCreatePost(true))} aria-label="Create a story">
            <span className="story-ring"><span className="story-create-avatar"><Avatar className="story-avatar" avatarUrl={user?.avatar} username={user?.username} /><span>+</span></span></span>
            <span className="story-username">Your story</span>
        </button>
>>>>>>> Stashed changes
        {stories.map(story => <button key={story._id} type="button" className="story-item"
            aria-label={'View story by ' + story.userId.username}
            onClick={() => dispatch(postDetailModalActions.openPostDetailModal({ post: story, prevPath: '/' }))}>
            <span className="story-ring"><Avatar className="story-avatar" avatarUrl={story.userId.avatar} username={story.userId.username} /></span>
            <span className="story-username" title={story.userId.username}>{story.userId.username}</span>
        </button>)}
    </Card>;
}
