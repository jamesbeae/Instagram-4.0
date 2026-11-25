import { useEffect, useMemo, useState } from 'react';
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
    const storyGroups = useMemo(() => {
        const grouped = new Map<string, Post[]>();
        stories.forEach(story => {
            const authorId = story.userId._id;
            const authorStories = grouped.get(authorId) || [];
            authorStories.push(story);
            grouped.set(authorId, authorStories);
        });
        return [...grouped.values()].map(group => group.sort((a, b) =>
            new Date(String(a.createdAt || 0)).getTime() - new Date(String(b.createdAt || 0)).getTime(),
        ));
    }, [stories]);
    const openStoryGroup = (groupIndex: number) => {
        const group = storyGroups[groupIndex];
        if (!group?.length) return;
        dispatch(postDetailModalActions.openPostDetailModal({
            post: group[0],
            prevPath: '/',
            storyGroups,
            storyGroupIndex: groupIndex,
        }));
    };
    useEffect(() => {
        const load = () => http.get('/post/stories').then(r => setStories(r.data.postsList)).catch(() => {});
        load();
        window.addEventListener('stories-updated', load);
        return () => window.removeEventListener('stories-updated', load);
    }, [http]);
    if (!stories.length && !user) return null;
    const ownGroupIndex = user ? storyGroups.findIndex(group => group[0]?.userId._id === user._id) : -1;
    return <Card as="section" className="feed-card story-strip mt-4" aria-label="Stories">
        {user && <div className={`story-item story-create${ownGroupIndex >= 0 ? ' has-story' : ''}`}>
            <button type="button" className="story-item-button" aria-label={ownGroupIndex >= 0 ? 'View your story' : 'Create story'}
                onClick={() => ownGroupIndex >= 0 ? openStoryGroup(ownGroupIndex) : dispatch(sideBarActions.openCreatePost(true))}>
                <span className="story-ring story-create-avatar"><Avatar className="story-avatar" avatarUrl={user.avatar} username={user.username} /></span>
                <span className="story-username">Your story</span>
            </button>
            <button type="button" className="story-add-button" aria-label="Add to your story"
                onClick={() => dispatch(sideBarActions.openCreatePost(true))}>+</button>
        </div>}
        {storyGroups.map((group, groupIndex) => {
            const story = group[0]!;
            if (user && story?.userId._id === user._id) return null;
            return <button key={story.userId._id} type="button" className="story-item"
                aria-label={`View ${story.userId.username}'s stories (${group.length})`}
                onClick={() => openStoryGroup(groupIndex)}>
                <span className="story-ring"><Avatar className="story-avatar" avatarUrl={story.userId.avatar} username={story.userId.username} /></span>
                <span className="story-username" title={story.userId.username}>{story.userId.username}</span>
            </button>;
        })}
    </Card>;
}
