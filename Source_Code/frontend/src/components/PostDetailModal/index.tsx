import React, { useEffect } from "react";
import { Post } from "../../models/Post";
import VideoPhotoSwiper from "../UI/VideoPhotoSwiper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import { postDetailModalActions } from "../../lib/redux/postDetailModalSlice";
import PostDescription from "./PostDescription";
import "../../pages/Home/StoryList/StoryList.css";
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
    return (<div className={`fixed z-50 w-screen h-screen inset-0 flex justify-center items-center`}>
            {/* This is the backdrop*/}
            <div className="absolute inset-0 h-screen w-screen bg-dark opacity-70 z-10" onClick={closePostDetailModal}></div>

            {/* This is the x close btn */}
            <div className="absolute top-2 right-8 text-textGray cursor-pointer z-20" onClick={closePostDetailModal}>
                <FontAwesomeIcon icon={faXmark} className="text-3xl"/>
            </div>

            {/* Modal */}
            <div className={"post-detail-dialog max-h-[90vh] overflow-auto max-w-[95vw] m-auto flex flex-col md:flex-row relative z-20 bg-dark border border-lightDark" + (postDataState?.kind === "STORY" ? " story-detail-modal" : "")}>
                {/* Post Photo Video Swiper */}
                <div className="story-detail-media max-h-[50vh] md:max-h-full w-full md:w-[50vw] md:max-w-[647px]">
                    {postDataState && (<VideoPhotoSwiper videoPhotoList={postDataState.photoVideo}/>)}
                </div>
                {/* Post Description */}
                {postDataState && <PostDescription key={postDataState._id} postData={postDataState}/>}
            </div>
        </div>);
};
export default PostDetailModal;
