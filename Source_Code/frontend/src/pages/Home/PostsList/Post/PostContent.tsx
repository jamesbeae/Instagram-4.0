import { Post } from '../../../../models/Post';
import VideoPhotoSwiper from '../../../../components/UI/VideoPhotoSwiper';
import PostActions from '../../../../components/PostActions';
import { useAppDispatch } from '../../../../hooks/useStore';
import { postDetailModalActions } from '../../../../lib/redux/postDetailModalSlice';
import { useLocation, Link } from 'react-router-dom';
import usePrivateHttp from '../../../../hooks/usePrivateHttp';
import { useEffect, useRef } from 'react';
export default function PostContent({ postData }: {
    postData: Post;
}) {
    const dispatch = useAppDispatch(), location = useLocation(), http = usePrivateHttp(), ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) {
        http.post('/post/' + postData._id + '/interaction', { type: 'VIEW' }).catch(() => { });
        observer.disconnect();
    } }, { threshold: 0.5 }); if (ref.current)
        observer.observe(ref.current); return () => observer.disconnect(); }, [postData._id, http]);
    const open = () => dispatch(postDetailModalActions.openPostDetailModal({ post: postData, prevPath: location.pathname }));
    return <div ref={ref} className="w-full"><div className="border border-lightDark rounded overflow-hidden max-h-[585px]"><VideoPhotoSwiper videoPhotoList={postData.photoVideo}/></div><PostActions post={postData} onComment={open}/><div className="text-sm"><Link className="font-semibold mr-1" to={'/profile/' + postData.userId._id}>{postData.userId.username}</Link>{postData.caption}</div><button type="button" className="text-sm text-textSecondGray" onClick={open}>View all comments</button></div>;
}
