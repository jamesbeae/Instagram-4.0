import { useLocation } from 'react-router-dom';
import Button from '../../../components/UI/Button/Button';
import CarouselIcon from '../../../components/UI/Icons/CarouselIcon';
import CommentIcon from '../../../components/UI/Icons/CommentIcon';
import LikeIcon from '../../../components/UI/Icons/LikeIcon';
import ReelsIcon from '../../../components/UI/Icons/ReelsIcon';
import { useAppDispatch } from '../../../hooks/useStore';
import { postDetailModalActions } from '../../../lib/redux/postDetailModalSlice';
import type { Post } from '../../../models/Post';

const count = new Intl.NumberFormat(undefined, { notation: 'compact' });

export default function ProfilePost({ post }: { post: Post }) {
    const dispatch = useAppDispatch();
    const { pathname } = useLocation();
    const cover = post.photoVideo[0];
    const likes = post.likes?.length ?? 0;
    const comments = post.comments?.length ?? 0;
    const title = post.caption?.trim() || 'View post';

    return (
        <Button className="profile-post-tile" aria-haspopup="dialog"
            aria-label={`${title}, ${likes} ${likes === 1 ? 'like' : 'likes'}, ${comments} ${comments === 1 ? 'comment' : 'comments'}`}
            onClick={event => {
                event.currentTarget.focus({ preventScroll: true });
                dispatch(postDetailModalActions.openPostDetailModal({ post, prePath: pathname }));
            }}>
            {cover?.url ? cover.type === 'VIDEO' ? (
                <video src={cover.url} muted playsInline preload="metadata" aria-hidden="true" />
            ) : <img src={cover.url} alt="" loading="lazy" decoding="async" /> : <span className="profile-text-tile">{title}</span>}
            {(post.photoVideo.length > 1 || cover?.type === 'VIDEO') && (
                <span className="profile-media-type" aria-hidden="true">
                    {post.photoVideo.length > 1 ? <CarouselIcon /> : <ReelsIcon />}
                </span>
            )}
            <span className="profile-tile-stats" aria-hidden="true">
                <span><LikeIcon />{count.format(likes)}</span>
                <span><CommentIcon />{count.format(comments)}</span>
            </span>
        </Button>
    );
}
