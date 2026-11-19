import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../../components/UI/Avatar/Avatar';
import Button from '../../../components/UI/Button/Button';
import Card from '../../../components/UI/Card';
import usePrivateHttp from '../../../hooks/usePrivateHttp';
import { useAppSelector } from '../../../hooks/useStore';
import type { Profile } from '../../../models/Profile';
import type { User } from '../../../models/User';
import { createFollow, deleteFollow } from '../../../services/userService';
import EditProfileModal from '../EditProfileModal';

export default function TopInformation({ profile, onProfileUpdated }: {
    profile: Profile;
    onProfileUpdated: (user: User) => void;
}) {
    const navigate = useNavigate();
    const http = usePrivateHttp();
    const currentUserId = useAppSelector(state => state.authSlice.userInfo?._id);
    const isOwnProfile = profile._id === currentUserId;
    const name = profile.fullName || profile.username || 'Profile';
    const [editing, setEditing] = useState(false);
    const [followers, setFollowers] = useState(0);
    const [following, setFollowing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setFollowers(profile.followers?.length ?? 0);
        setFollowing(Boolean(profile.followers?.some(follower => follower._id === currentUserId)));
    }, [profile.followers, currentUserId]);

    async function toggleFollow() {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const action = following ? deleteFollow : createFollow;
            const response = await action(http, profile._id);
            if (!response || response.status >= 400) throw Error('Follow action failed');
            setFollowing(!following);
            setFollowers(count => following ? Math.max(0, count - 1) : count + 1);
        } catch {
            setError(following ? 'Unable to unfollow this account.' : 'Unable to follow this account.');
        } finally {
            setBusy(false);
        }
    }

    async function viewActivity() {
        setError('');
        try {
            const { data } = await http.get<{ activity: { type: string; createdAt: string }[] }>('/user/activity');
            alert(data.activity.map(item => `${item.type} · ${new Date(item.createdAt).toLocaleString()}`).join('\n') || 'No activity yet');
        } catch {
            setError('Unable to load your activity.');
        }
    }

    return (
        <>
            <Card as="section" className="profile-identity" aria-labelledby="profile-name">
                <span aria-hidden="true"><Avatar avatarUrl={profile.avatar} username={profile.username} className="profile-avatar" /></span>
                <div className="profile-info">
                    <div className="profile-name-row">
                        <div className="profile-name">
                            <h1 id="profile-name">{name}</h1>
                            {profile.username && <p className="profile-muted">@{profile.username}</p>}
                        </div>
                        <div className="profile-actions">
                            {isOwnProfile ? (
                                <>
                                    <Button className="profile-action" onClick={() => setEditing(true)}>Edit profile</Button>
                                    <Button className="profile-action" onClick={viewActivity}>View activity</Button>
                                </>
                            ) : (
                                <>
                                    <Button className="profile-action" disabled={busy} onClick={toggleFollow}>{following ? 'Unfollow' : 'Follow'}</Button>
                                    <Button className="profile-action" onClick={() => navigate(`/message/${profile._id}`, { state: { user: profile } })}>Message</Button>
                                </>
                            )}
                        </div>
                    </div>
                    <ul className="profile-stats" aria-label="Profile counts">
                        <li><strong>{profile.posts.length}</strong> posts</li>
                        <li><strong>{followers}</strong> followers</li>
                        <li><strong>{profile.followings?.length ?? 0}</strong> following</li>
                    </ul>
                    {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                    {profile.email && <p className="profile-muted profile-email">{profile.email}</p>}
                    {error && <p className="profile-error" role="alert">{error}</p>}
                </div>
            </Card>
            {editing && <EditProfileModal user={profile} onUpdated={onProfileUpdated} onClose={() => setEditing(false)} />}
        </>
    );
}
