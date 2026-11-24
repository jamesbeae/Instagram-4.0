import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPlay, faVolumeHigh, faVolumeXmark, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Post } from "../../models/Post";
import Avatar from "../UI/Avatar/Avatar";
import Button from "../UI/Button/Button";
import "./StoryViewer.css";

const PHOTO_DURATION_MS = 6000;

export default function StoryViewer({ storyGroups, initialGroupIndex, onClose }: {
    storyGroups: Post[][];
    initialGroupIndex: number;
    onClose: () => void;
}) {
    const safeGroups = storyGroups.filter(group => group.length > 0);
    const [groupIndex, setGroupIndex] = useState(() => Math.min(Math.max(initialGroupIndex, 0), Math.max(safeGroups.length - 1, 0)));
    const [storyIndex, setStoryIndex] = useState(0);
    const [mediaIndex, setMediaIndex] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
    const viewerRef = useRef<HTMLElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const currentGroup = safeGroups[groupIndex] || [];
    const post = currentGroup[storyIndex];
    const media = post?.photoVideo || [];
    const activeMedia = media[mediaIndex];

    const nextMedia = useCallback(() => {
        if (mediaIndex < media.length - 1) {
            setMediaIndex(index => index + 1);
        } else if (storyIndex < currentGroup.length - 1) {
            setStoryIndex(index => index + 1);
            setMediaIndex(0);
        } else if (groupIndex < safeGroups.length - 1) {
            setGroupIndex(index => index + 1);
            setStoryIndex(0);
            setMediaIndex(0);
        } else {
            onClose();
        }
    }, [currentGroup.length, groupIndex, media.length, mediaIndex, onClose, safeGroups.length, storyIndex]);

    const previousMedia = useCallback(() => {
        if (mediaIndex > 0) {
            setMediaIndex(index => index - 1);
        } else if (storyIndex > 0) {
            const previousPost = currentGroup[storyIndex - 1];
            setStoryIndex(index => index - 1);
            setMediaIndex(Math.max((previousPost?.photoVideo?.length || 1) - 1, 0));
        } else if (groupIndex > 0) {
            const previousGroup = safeGroups[groupIndex - 1] || [];
            const previousStoryIndex = previousGroup.length - 1;
            const previousPost = previousGroup[previousStoryIndex];
            setGroupIndex(index => index - 1);
            setStoryIndex(previousStoryIndex);
            setMediaIndex(Math.max((previousPost?.photoVideo?.length || 1) - 1, 0));
        }
    }, [currentGroup, groupIndex, mediaIndex, safeGroups, storyIndex]);

    useEffect(() => {
        viewerRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        setVideoProgress(0);
        setNeedsTapToPlay(false);
        if (!activeMedia || activeMedia.type === "VIDEO") return;
        const timer = window.setTimeout(nextMedia, PHOTO_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [groupIndex, storyIndex, mediaIndex, activeMedia, nextMedia]);

    if (!post) return null;

    const activeProgressIndex = currentGroup.slice(0, storyIndex)
        .reduce((count, item) => count + (item.photoVideo?.length || 0), 0) + mediaIndex;
    const progressItems = currentGroup.flatMap((item, postIndex) => (item.photoVideo || []).map((asset, assetIndex) => ({
        asset,
        key: `${groupIndex}-${asset._id || `${postIndex}-${assetIndex}`}`,
    })));
    const progressSegments = progressItems.length ? progressItems : [{ asset: null, key: "empty" }];
    const hasPreviousMedia = groupIndex > 0 || storyIndex > 0 || mediaIndex > 0;
    const hasNextMedia = groupIndex < safeGroups.length - 1 || storyIndex < currentGroup.length - 1 || mediaIndex < media.length - 1;

    return (
        <div className="story-viewer-overlay" onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }} onKeyDown={event => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowLeft") previousMedia();
            if (event.key === "ArrowRight" && hasNextMedia) nextMedia();
        }}>
            <div className="story-viewer-backdrop" aria-hidden="true" />
            <div className="story-viewer-stage">
                <Button className="story-viewer-nav story-viewer-nav-previous" aria-label="Previous story"
                    disabled={!hasPreviousMedia} onClick={previousMedia}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                </Button>

                <section ref={viewerRef} className="story-viewer" role="dialog" tabIndex={-1} aria-modal="true"
                    aria-label={`Story by ${post.userId.username || post.userId.fullName || "user"}`}>
                    <div className="story-viewer-media" key={`${post._id}-${activeMedia?._id || mediaIndex}`}>
                        {activeMedia?.type === "VIDEO" ? (
                            <video ref={videoRef} src={activeMedia.url} autoPlay muted={isMuted} playsInline onEnded={nextMedia}
                                onCanPlay={event => {
                                    event.currentTarget.play()
                                        .then(() => setNeedsTapToPlay(false))
                                        .catch(() => setNeedsTapToPlay(true));
                                }}
                                onPlay={() => setNeedsTapToPlay(false)}
                                onTimeUpdate={event => {
                                    const video = event.currentTarget;
                                    setVideoProgress(video.duration ? video.currentTime / video.duration : 0);
                                }} />
                        ) : activeMedia ? (
                            <img src={activeMedia.url} alt={post.caption || "Story"} />
                        ) : (
                            <div className="story-viewer-empty">This story has no media.</div>
                        )}
                    </div>

                    <div className="story-viewer-shade story-viewer-shade-top" />
                    <div className="story-viewer-progress" aria-hidden="true">
                        {progressSegments.map(({ asset, key }, index) => (
                            <span className="story-viewer-progress-track" key={key}>
                                <span className={`story-viewer-progress-fill${index < activeProgressIndex ? " is-complete" : index === activeProgressIndex ? " is-active" : ""}`}
                                    style={index < activeProgressIndex ? undefined : index === activeProgressIndex && asset?.type === "VIDEO"
                                        ? { width: `${Math.min(100, videoProgress * 100)}%` }
                                        : undefined} />
                            </span>
                        ))}
                    </div>

                    <header className="story-viewer-header">
                        <Avatar className="story-viewer-avatar" avatarUrl={post.userId.avatar}
                            username={post.userId.username || post.userId.fullName} />
                        <div className="story-viewer-author">
                            <strong>{post.userId.username || post.userId.fullName}</strong>
                            <span>Story · {activeProgressIndex + 1} of {progressSegments.length}</span>
                        </div>
                        <Button className="story-viewer-audio" aria-label={isMuted ? "Unmute story video" : "Mute story video"}
                            onClick={() => setIsMuted(value => !value)}>
                            <FontAwesomeIcon icon={isMuted ? faVolumeXmark : faVolumeHigh} />
                        </Button>
                        <Button className="story-viewer-close" aria-label="Close story" onClick={onClose}>
                            <FontAwesomeIcon icon={faXmark} />
                        </Button>
                    </header>

                    {needsTapToPlay && <div className="story-viewer-play-prompt">
                        <Button onClick={() => {
                            const video = videoRef.current;
                            if (video) void video.play().then(() => setNeedsTapToPlay(false)).catch(() => setNeedsTapToPlay(true));
                        }}>
                            <FontAwesomeIcon icon={faPlay} /> <span>Tap to play with sound</span>
                        </Button>
                    </div>}

                    {post.caption && <>
                        <div className="story-viewer-shade story-viewer-shade-bottom" />
                        <p className="story-viewer-caption">{post.caption}</p>
                    </>}
                </section>

                <Button className="story-viewer-nav story-viewer-nav-next" aria-label="Next story"
                    disabled={!hasNextMedia} onClick={nextMedia}>
                    <FontAwesomeIcon icon={faChevronRight} />
                </Button>
            </div>
        </div>
    );
}
