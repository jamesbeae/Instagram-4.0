import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeHigh, faVolumeXmark, faPlay } from '@fortawesome/free-solid-svg-icons';
import type { Post } from '../models/Post';
import Avatar from '../components/UI/Avatar/Avatar';
import Button from '../components/UI/Button/Button';
import Loading from '../components/UI/Loading';
import PostActions from '../components/PostActions';
import ReelCommentsPanel from './ReelCommentsPanel';
import './ReelsFeed.css';

type ReelsFeedProps = {
    posts: Post[];
    loading: boolean;
    error: string;
    hasMore: boolean;
    onLoadMore: () => void;
};

export default function ReelsFeed({ posts, loading, error, hasMore, onLoadMore }: ReelsFeedProps) {
    const feedRef = useRef<HTMLElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

    useEffect(() => {
        const root = feedRef.current;
        const sentinel = sentinelRef.current;
        if (!root || !sentinel || loading || error || !hasMore) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) onLoadMore();
        }, { root, rootMargin: '500px 0px' });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [error, hasMore, loading, onLoadMore, posts.length]);

    return <main ref={feedRef} className="reels-page min-w-0 flex-1" aria-label="Reels feed">
        <h1 className="sr-only">Reels</h1>
        <div className="reels-track">
            {posts.map(post => <ReelItem key={post._id} post={post} commentsOpen={commentsPostId === post._id}
                onToggleComments={() => setCommentsPostId(current => current === post._id ? null : post._id)}
                onCloseComments={() => setCommentsPostId(null)} />)}
            {!posts.length && loading && <Loading message="Loading Reels…" className="reels-message" />}
            {!posts.length && !loading && !error && <p className="reels-message">No Reels yet. Create a Reel with one video to get started.</p>}
            {error && <div className="reels-message" role="alert"><p>{error}</p><Button onClick={onLoadMore} className="mt-3 rounded-lg bg-lightDark px-4 py-2">Try again</Button></div>}
            {loading && posts.length > 0 && <Loading message="Loading more Reels…" className="reels-message" />}
            {hasMore && !error && <div ref={sentinelRef} className="reels-sentinel" aria-hidden="true" />}
            {!hasMore && posts.length > 0 && !loading && <p className="reels-end-message">You’re all caught up.</p>}
        </div>
    </main>;
}

function ReelItem({ post, commentsOpen, onToggleComments, onCloseComments }: { post: Post; commentsOpen: boolean; onToggleComments: () => void; onCloseComments: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoRatio, setVideoRatio] = useState<number | null>(null);
    const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
    const video = post.photoVideo?.find(media => media.type === 'VIDEO');
    const author = post.userId;
    const narrow = viewport.width <= 640;
    const sidebarWidth = viewport.width <= 1100 ? 72 : 240;
    const gap = narrow ? 5 : 14;
    const actionRailWidth = narrow ? 50 : 56;
    const outsideRail = videoRatio === null || videoRatio <= 1;
    const outsideRailSpace = outsideRail ? actionRailWidth + gap : 0;
    const horizontalPadding = narrow ? 0 : 24;
    const widthByFormat = videoRatio && videoRatio > 1.2 ? 900 : videoRatio && videoRatio > 0.85 ? 620 : 460;
    const commentsWidth = commentsOpen && viewport.width > 760 ? (viewport.width <= 1100 ? 340 : 390) : 0;
    const maxWidth = Math.max(1, Math.min(widthByFormat, viewport.width - sidebarWidth - horizontalPadding - outsideRailSpace - (commentsWidth ? commentsWidth + gap : 0)));
    const maxHeight = Math.min(900, viewport.height - 32);
    const frameWidth = videoRatio ? Math.min(maxWidth, maxHeight * videoRatio) : maxWidth;
    const frameHeight = videoRatio ? frameWidth / videoRatio : maxHeight;

    useEffect(() => {
        const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    useEffect(() => {
        setVideoRatio(null);
        setVideoError(false);
    }, [video?.url]);

    useEffect(() => {
        const element = videoRef.current;
        if (!element) return;
        const observer = new IntersectionObserver(entries => {
            const visible = entries.some(entry => entry.isIntersecting);
            if (!visible) {
                element.pause();
                setPlaying(false);
                return;
            }
            void element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }, { threshold: 0.65 });
        observer.observe(element);
        return () => {
            observer.disconnect();
            element.pause();
        };
    }, [video?.url]);

    function togglePlayback() {
        const element = videoRef.current;
        if (!element) return;
        if (element.paused) void element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        else { element.pause(); setPlaying(false); }
    }

    return <article className="reel-item" data-comments-open={commentsOpen} aria-label={`Reel by ${author?.username || 'user'}`}>
        <div className="reel-media-stage" style={{ width: frameWidth + outsideRailSpace, height: frameHeight }}>
          <div className="reel-frame" style={{ width: frameWidth, height: frameHeight }} onClick={event => { if ((event.target as HTMLElement).closest('button, a')) return; togglePlayback(); }}>
            {video?.url && !videoError ? <video ref={videoRef} src={video.url} muted={muted} loop playsInline preload="metadata" onLoadedMetadata={event => {
                const element = event.currentTarget;
                if (element.videoWidth && element.videoHeight) setVideoRatio(element.videoWidth / element.videoHeight);
            }} onError={() => setVideoError(true)} aria-label={`Video by ${author?.username || 'user'}`} />
                : <div className="reel-video-fallback">This video can’t be played.</div>}
            <div className="reel-bottom-gradient" />
            {!playing && !videoError && <button type="button" aria-label="Play video" className="reel-play-button" onClick={togglePlayback}><FontAwesomeIcon icon={faPlay} /></button>}
            <button type="button" aria-label={muted ? 'Unmute video' : 'Mute video'} className="reel-sound-button" onClick={() => setMuted(value => !value)}>
                <FontAwesomeIcon icon={muted ? faVolumeXmark : faVolumeHigh} />
            </button>
            <div className="reel-caption">
                <Link to={`/profile/${author?._id}`} className="reel-author">
                    <Avatar className="h-9 w-9 shrink-0" avatarUrl={author?.avatar} username={author?.username} />
                    <span>@{author?.username || author?.fullName || 'user'}</span>
                </Link>
                {post.caption && <p>{post.caption}</p>}
                <span className="reel-audio-label">♫ Original audio</span>
            </div>
          </div>
          <aside className={`reel-action-rail${outsideRail ? ' reel-action-rail-outside' : ''}`} aria-label="Reel actions"
              style={outsideRail ? { left: frameWidth + gap, right: 'auto' } : undefined}>
                <PostActions post={post} onComment={onToggleComments} vertical />
            </aside>
        </div>
        {commentsOpen && <ReelCommentsPanel post={post} onClose={onCloseComments} compact={viewport.width <= 760} />}
    </article>;
}
