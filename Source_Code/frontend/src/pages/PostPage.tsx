import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Post } from '../models/Post';
import usePrivateHttp from '../hooks/usePrivateHttp';
import VideoPhotoSwiper from '../components/UI/VideoPhotoSwiper';
import PostDescription from '../components/PostDetailModal/PostDescription';
export default function PostPage() { const { postId } = useParams(), http = usePrivateHttp(), [post, setPost] = useState<Post>(), [error, setError] = useState(''); useEffect(() => { http.get('/post/' + postId).then(r => setPost(r.data.post)).catch(() => setError('Post not found')); }, [postId, http]); useEffect(() => { const update = (e: Event) => { const p = (e as CustomEvent<Post>).detail; if (p._id === postId)
    setPost(p); }; const remove = (e: Event) => { if ((e as CustomEvent<string>).detail === postId) {
    setPost(undefined);
    setError('Post deleted');
} }; window.addEventListener('post-updated', update); window.addEventListener('post-deleted', remove); return () => { window.removeEventListener('post-updated', update); window.removeEventListener('post-deleted', remove); }; }, [postId]); return post ? <div className="text-white flex p-6 overflow-auto"><div className="w-1/2"><VideoPhotoSwiper videoPhotoList={post.photoVideo}/></div><PostDescription key={post._id} postData={post}/></div> : <p className="text-white p-6">{error || 'Loading…'}</p>; }
