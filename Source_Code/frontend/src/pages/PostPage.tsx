import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../components/UI/Loading';
import Card from '../components/UI/Card';
import VideoPhotoSwiper from '../components/UI/VideoPhotoSwiper';
import PostDescription from '../components/PostDetailModal/PostDescription';
import { Post } from '../models/Post';
import usePrivateHttp from '../hooks/usePrivateHttp';
import '../components/PostDetailModal/PostDetailModal.css';

export default function PostPage() {
    const { postId } = useParams();
    const http = usePrivateHttp();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post>();
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        setPost(undefined);
        setError('');
        http.get('/post/' + postId)
            .then(response => { if (active) setPost(response.data.post); })
            .catch(() => { if (active) setError('Post not found or unavailable.'); });
        return () => { active = false; };
    }, [postId, http]);

    useEffect(() => {
        const update = (event: Event) => {
            const updated = (event as CustomEvent<Post>).detail;
            if (updated._id === postId) setPost(updated);
        };
        const remove = (event: Event) => {
            if ((event as CustomEvent<string>).detail === postId) {
                setPost(undefined);
                setError('This post has been deleted.');
            }
        };
        window.addEventListener('post-updated', update);
        window.addEventListener('post-deleted', remove);
        return () => {
            window.removeEventListener('post-updated', update);
            window.removeEventListener('post-deleted', remove);
        };
    }, [postId]);

    if (error) return <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto p-6 text-foreground"><p role="alert">{error}</p></main>;
    if (!post) return <Loading className="min-w-0 flex-1 self-start p-6 text-foreground" />;

    return <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto p-6">
        <Card className="post-detail-dialog relative">
            <div className="post-detail-media">
                <VideoPhotoSwiper videoPhotoList={post.photoVideo} />
            </div>
            <PostDescription key={post._id} postData={post} onClose={() => navigate(-1)} />
        </Card>
    </main>;
}
