import React, { useEffect } from "react";
import { Post } from "../../models/Post";
import VideoPhotoSwiper from "../UI/VideoPhotoSwiper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Card from "../UI/Card";
import Button from "../UI/Button/Button";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import { postDetailModalActions } from "../../lib/redux/postDetailModalSlice";
import PostDescription from "./PostDescription";
import "../../pages/Home/StoryList/StoryList.css";
import "./PostDetailModal.css";
const PostDetailModal: React.FC<{
    postData?: Post;
}> = ({ postData }) => {
    const dispatch = useAppDispatch();
    const [postDataState, setPostDataState] = React.useState<Post | null>(null);
    const updatedPost = useAppSelector(s => s.postsListSlice.find(p => p._id === (postData?._id || s.postDetailModalSlice.post?._id)));
    const postDetailSlice = useAppSelector((state) => state.postDetailModalSlice);
    useEffect(() => {
        if (postData) {
            setPostDataState(updatedPost || postData);
        }
        else {
            setPostDataState(updatedPost || postDetailSlice.post);
        }
    }, [postData, postDetailSlice.post, updatedPost]);
    useEffect(() => { const update = (e: Event) => { const p = (e as CustomEvent<Post>).detail; if (p._id === postDataState?._id)
        setPostDataState(p); }; window.addEventListener("post-updated", update); return () => window.removeEventListener("post-updated", update); }, [postDataState?._id]);
    const closePostDetailModal = () => {
        dispatch(postDetailModalActions.closePostDetailModal());
    };
    const isStory = postDataState?.kind === "STORY";
    const Dialog = isStory ? "div" : Card;

    return (<div className="fixed z-50 inset-0 flex justify-center items-center"
            onKeyDown={event => {
                if (event.key === "Escape" && !event.defaultPrevented) {
                    event.preventDefault();
                    closePostDetailModal();
                }
            }}>
            {/* This is the backdrop*/}
            <div className={isStory ? "absolute inset-0 bg-dark opacity-70 z-10" : "post-detail-backdrop absolute inset-0 z-10"}
                onClick={closePostDetailModal} />
            {isStory && <Button className="absolute top-2 right-8 text-textGray z-20"
                aria-label="Close story" onClick={closePostDetailModal}>
                <FontAwesomeIcon icon={faXmark} className="text-3xl" />
            </Button>}
            <Dialog className={isStory ? "post-detail-dialog story-detail-modal relative z-20 bg-dark border border-lightDark" : "post-detail-dialog relative z-20"}
                role="dialog" aria-label={isStory ? "Story details" : "Post details"} aria-modal="true">
                <div className={isStory ? "story-detail-media" : "post-detail-media"}>
                    {postDataState && <VideoPhotoSwiper videoPhotoList={postDataState.photoVideo} />}
                </div>
                {postDataState && <PostDescription key={postDataState._id} postData={postDataState}
                    onClose={isStory ? undefined : closePostDetailModal} />}
            </Dialog>
        </div>);
};
export default PostDetailModal;
