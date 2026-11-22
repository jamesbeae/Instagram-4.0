import React from "react";
import { Post } from "../../../models/Post";
import CarouselIcon from "../../../components/UI/Icons/CarouselIcon";
import LikeIcon from "../../../components/UI/Icons/LikeIcon";
import CommentIcon from "../../../components/UI/Icons/CommentIcon";
import { useAppDispatch } from "../../../hooks/useStore";
import { postDetailModalActions } from "../../../lib/redux/postDetailModalSlice";

const ProfilePost: React.FC<{ post: Post }> = ({ post }) => {
    const dispatch = useAppDispatch();
    const preview = post.photoVideo?.[0];
    const [previewFailed, setPreviewFailed] = React.useState(false);
    const handleOpenPostDetail = (postData: Post) => {
        dispatch(
            postDetailModalActions.openPostDetailModal({
                post: postData,
                prevPath: location.pathname,
            })
        );
    };
    return (
        <div
            key={post._id}
            className="relative aspect-[3/4] group cursor-pointer overflow-hidden"
            onClick={() => handleOpenPostDetail(post)}
        >
            {preview && !previewFailed ? preview.type === 'VIDEO' ? (
                <video
                    src={preview.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    aria-label="Video post preview"
                    onError={() => setPreviewFailed(true)}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
            ) : (
                <img
                    src={preview.url}
                    alt="Post"
                    onError={() => setPreviewFailed(true)}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
            ) : (
                <div role="img" aria-label="Preview unavailable" className="grid h-full w-full place-items-center bg-lightDark text-sm text-textSecondGray">
                    Preview unavailable
                </div>
            )}

            {preview?.type === 'VIDEO' && !previewFailed && (
                <div aria-hidden="true" className="absolute top-2 right-2 z-10 rounded bg-black/60 px-2 py-1 text-xs text-white">▶</div>
            )}

            {/* Carousel indicator */}
            {post.photoVideo.length > 1 && (
                <div className="absolute top-2 right-2 z-10 text-white">
                    <CarouselIcon />
                </div>
            )}

            {/* Hover overlay with stats */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-2">
                <div className="flex items-center gap-6 text-white">
                    {post.likes !== undefined && (
                        <div className="flex items-center gap-2">
                            <LikeIcon />
                            <span className="font-bold text-lg">
                                {post.likes.length}
                            </span>
                        </div>
                    )}
                    {post.comments !== undefined && (
                        <div className="flex items-center gap-2">
                            <CommentIcon />
                            <span className="font-bold text-lg">
                                {post.comments.length}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePost;
