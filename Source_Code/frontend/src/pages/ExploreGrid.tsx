import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useStore';
import { postDetailModalActions } from '../lib/redux/postDetailModalSlice';
import CommentIcon from '../components/UI/Icons/CommentIcon';
import LikeIcon from '../components/UI/Icons/LikeIcon';
import ReelsIcon from '../components/UI/Icons/ReelsIcon';
import type { PhotoVideo } from '../models/PhotoVideo';
import type { Post } from '../models/Post';
import './ExploreGrid.css';

const groupSize = 5;
const countFormat = new Intl.NumberFormat(undefined, { notation: 'compact' });

function coverKey(cover: PhotoVideo) {
    return `${cover.type}:${cover.url}`;
}

export default function ExploreGrid({ posts }: { posts: Post[] }) {
    const dispatch = useAppDispatch();
    const { pathname } = useLocation();
    const [portraits, setPortraits] = useState<ReadonlyMap<string, boolean>>(() => new Map());

    function measureCover(cover: PhotoVideo, width = 0, height = 0) {
        const key = coverKey(cover);
        const isPortrait = width > 0 && height > width;
        setPortraits(previous => previous.get(key) === isPortrait ? previous : new Map(previous).set(key, isPortrait));
    }

    const groups = Array.from({ length: Math.ceil(posts.length / groupSize) }, (_, index) =>
        posts.slice(index * groupSize, (index + 1) * groupSize));

    return (
        <div className="explore-gallery">
            {groups.map((group, index) => {
                const side = index % 2 === 0 ? 'right' : 'left';
                let featured: Post | undefined;
                if (group.length === groupSize) {
                    for (const post of group) {
                        const cover = post.photoVideo[0];
                        if (!cover?.url) continue;
                        const isPortrait = portraits.get(coverKey(cover));
                        // Wait for earlier covers so a later one doesn't move twice as media loads.
                        if (isPortrait === undefined) break;
                        if (isPortrait) {
                            featured = post;
                            break;
                        }
                    }
                }

                const tiles = featured ? group.filter(post => post !== featured) : group;
                if (featured) tiles.splice(side === 'left' ? 0 : 2, 0, featured);
                return (
                    <div className="explore-group" key={group[0]._id} data-side={side}>
                        {tiles.map(post => (
                            <ExploreTile key={post._id} post={post} featured={post === featured}
                                measureCover={measureCover}
                                openPost={() => dispatch(postDetailModalActions.openPostDetailModal({ post, prePath: pathname }))} />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

function ExploreTile({ post, featured, measureCover, openPost }: {
    post: Post;
    featured: boolean;
    openPost: () => void;
    measureCover: (cover: PhotoVideo, width?: number, height?: number) => void;
}) {
    const cover = post.photoVideo[0];
    const isVideo = cover?.type === 'VIDEO';
    const author = post.userId?.username;
    const likes = post.likes.length;
    const comments = post.comments.length;
    const title = post.caption?.trim() || (author ? `Post by ${author}` : 'View post');

    return (
        <Link to={`/post/${post._id}`} className="explore-tile" data-featured={featured} aria-haspopup="dialog"
            onClick={event => {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                event.currentTarget.focus({ preventScroll: true });
                openPost();
            }}
            aria-label={`${title}, ${likes} ${likes === 1 ? 'like' : 'likes'}, ${comments} ${comments === 1 ? 'comment' : 'comments'}`}>
            {cover?.url ? isVideo ? (
                <video src={cover.url} muted playsInline preload="metadata" aria-hidden="true"
                    onLoadedMetadata={event => measureCover(cover, event.currentTarget.videoWidth, event.currentTarget.videoHeight)}
                    onError={() => measureCover(cover)} />
            ) : (
                <img src={cover.url} alt="" loading="lazy" decoding="async"
                    onLoad={event => measureCover(cover, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                    onError={() => measureCover(cover)} />
            ) : <span className="explore-text-cover" aria-hidden="true">{title}</span>}
            {isVideo && <span className="explore-video-icon" aria-hidden="true"><ReelsIcon /></span>}
            {featured && (post.caption || author) && (
                <span className="explore-feature-caption" aria-hidden="true">
                    {post.caption && <strong>{post.caption}</strong>}
                    {author && <small>@{author}</small>}
                </span>
            )}
            <span className="explore-tile-stats" aria-hidden="true">
                <span><LikeIcon />{countFormat.format(likes)}</span>
                <span><CommentIcon />{countFormat.format(comments)}</span>
            </span>
        </Link>
    );
}
