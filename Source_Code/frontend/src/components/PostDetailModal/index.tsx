import React, { useEffect, useId, useLayoutEffect, useRef } from "react";
import { DraftScope, useConfirmDiscard } from "../UnsavedChanges";
import { Post } from "../../models/Post";
import VideoPhotoSwiper from "../UI/VideoPhotoSwiper";
import Card from "../UI/Card";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import { postDetailModalActions } from "../../lib/redux/postDetailModalSlice";
import PostDescription from "./PostDescription";
import "./PostDetailModal.css";
import StoryViewer from "../StoryViewer";
const PostDetailModal: React.FC<{
    postData?: Post;
}> = ({ postData }) => {
    const dispatch = useAppDispatch();
    const draftScope = useId();
    const overlayRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const opener = document.activeElement;
        const overlay = overlayRef.current;
        overlay?.querySelector<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
        return () => {
            queueMicrotask(() => {
                if (opener instanceof HTMLElement && opener.isConnected && !overlay?.isConnected &&
                    document.activeElement === document.body) {
                    opener.focus({ preventScroll: true });
                }
            });
        };
    }, []);
    const confirmDiscard = useConfirmDiscard();
    const postDetailSlice = useAppSelector((state) => state.postDetailModalSlice);
    const updatedPost = useAppSelector(s => s.postsListSlice.find(p => p._id === (postData?._id || s.postDetailModalSlice.post?._id)));
    const [postDataState, setPostDataState] = React.useState<Post | null>(updatedPost || postData || postDetailSlice.post);
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
        confirmDiscard(() => dispatch(postDetailModalActions.closePostDetailModal()), draftScope);
    };
    const isStory = postDataState?.kind === "STORY";
    return (<DraftScope.Provider value={draftScope}>{isStory ? <StoryViewer
            storyGroups={postDetailSlice.storyGroups || [[postDataState!]]}
            initialGroupIndex={postDetailSlice.storyGroupIndex}
            onClose={closePostDetailModal} /> : <div ref={overlayRef} className="fixed z-50 inset-0 flex justify-center items-center"
            onKeyDown={event => {
                if (event.key === "Escape" && !event.defaultPrevented) {
                    event.preventDefault();
                    closePostDetailModal();
                }
            }}>
            {/* This is the backdrop*/}
            <div className="post-detail-backdrop absolute inset-0 z-10" onClick={closePostDetailModal} />
            <Card className="post-detail-dialog relative z-20"
                role="dialog" tabIndex={-1} aria-label="Post details" aria-modal="true">
                <div className="post-detail-media">
                    {postDataState && <VideoPhotoSwiper videoPhotoList={postDataState.photoVideo} />}
                </div>
                {postDataState && <PostDescription key={postDataState._id} postData={postDataState} onClose={closePostDetailModal} />}
            </Card>
        </div>}</DraftScope.Provider>);
};
export default PostDetailModal;
