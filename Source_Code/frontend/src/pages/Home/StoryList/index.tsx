import { useEffect, useState } from 'react';
import { Post } from '../../../models/Post';
import usePrivateHttp from '../../../hooks/usePrivateHttp';
import { useAppDispatch } from '../../../hooks/useStore';
import { postDetailModalActions } from '../../../lib/redux/postDetailModalSlice';
import Avatar from '../../../components/UI/Avatar/Avatar';
import './StoryList.css';

export default function StoryList() {
    const http = usePrivateHttp();
    const dispatch = useAppDispatch();
    const [stories, setStories] = useState<Post[]>([]);
    useEffect(() => {
        const load = () => http.get('/post/stories').then(r => setStories(r.data.postsList)).catch(() => {});
        load();
        window.addEventListener('stories-updated', load);
        return () => window.removeEventListener('stories-updated', load);
    }, [http]);
    if (!stories.length) return null;
    return <section className="story-strip" aria-label="Stories">
        {stories.map(story => <button key={story._id} type="button" className="story-item"
            aria-label={'View story by ' + story.userId.username}
            onClick={() => dispatch(postDetailModalActions.openPostDetailModal({ post: story, prevPath: '/' }))}>
            <span className="story-ring"><Avatar className="story-avatar" avatarUrl={story.userId.avatar} username={story.userId.username} /></span>
            <span className="story-username" title={story.userId.username}>{story.userId.username}</span>
        </button>)}
    </section>;
}
