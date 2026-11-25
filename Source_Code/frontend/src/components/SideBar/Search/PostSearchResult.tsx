import { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-regular-svg-icons";
import type { Post } from "../../../models/Post";
import calculateTimeAgo from "../../../utils/calculateTimeAgo";
import CommentIcon from "../../UI/Icons/CommentIcon";
import LikeIcon from "../../UI/Icons/LikeIcon";
import ReelsIcon from "../../UI/Icons/ReelsIcon";

const countFormat = new Intl.NumberFormat();

export default function PostSearchResult({ post, onOpen }: { post: Post; onOpen: () => void }) {
    const cover = post.photoVideo?.[0];
    const [failedCover, setFailedCover] = useState<string>();
    const showCover = Boolean(cover?.url && cover.url !== failedCover);
    const isVideo = cover?.type === "VIDEO";
    const author = post.userId?.username || post.userId?.fullName || "Unknown account";
    const createdAt = post.createdAt ? new Date(post.createdAt) : null;
    const hasDate = createdAt !== null && Number.isFinite(createdAt.getTime());
    const likes = post.likes?.length ?? 0;
    const comments = post.comments?.length ?? 0;

    return (
        <Link className="sidebar-post-result" to={`/post/${post._id}`} aria-haspopup="dialog"
            onClick={event => {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                event.currentTarget.focus({ preventScroll: true });
                onOpen();
            }}>
            <div className="sidebar-post-result-info">
                <div className="sidebar-post-result-byline">
                    <strong>{author}</strong>
                    {hasDate && (
                        <time dateTime={createdAt.toISOString()} title={createdAt.toLocaleString()}>
                            {Date.now() - createdAt.getTime() < 60_000 ? "Just now" : `${calculateTimeAgo(createdAt)} ago`}
                        </time>
                    )}
                </div>
                {post.caption?.trim() && <p className="sidebar-post-result-caption">{post.caption}</p>}
                <div className="sidebar-post-result-stats">
                    <span><span aria-hidden="true"><LikeIcon /></span>{countFormat.format(likes)}<span className="sr-only">{likes === 1 ? " like" : " likes"}</span></span>
                    <span><span aria-hidden="true"><CommentIcon /></span>{countFormat.format(comments)}<span className="sr-only">{comments === 1 ? " comment" : " comments"}</span></span>
                </div>
            </div>
            <div className="sidebar-post-result-cover" aria-hidden="true">
                {!showCover ? <FontAwesomeIcon icon={faImage} /> : isVideo ? (
                    <video src={cover.url} muted playsInline preload="metadata" onError={() => setFailedCover(cover.url)} />
                ) : (
                    <img src={cover.url} alt="" loading="lazy" decoding="async" onError={() => setFailedCover(cover.url)} />
                )}
                {isVideo && <span className="sidebar-post-result-video"><ReelsIcon /></span>}
            </div>
            {isVideo && <span className="sr-only">Video</span>}
        </Link>
    );
}
