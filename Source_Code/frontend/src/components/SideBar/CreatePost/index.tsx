import CreatePostModal from "./CreatePostModal";
import { useAppDispatch } from "../../../hooks/useStore";
import { useCallback } from "react";
import { sideBarActions } from "../../../lib/redux/sideBarSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
const CreatePost = () => {
    const dispatch = useAppDispatch();
    const closeCreatePostModal = useCallback(() => {
        dispatch(sideBarActions.openCreatePost(false));
    }, [dispatch]);
    return (<div className={` absolute w-screen h-screen flex justify-center items-center`}>
            {/* This is the backdrop*/}
            <div className="absolute inset-0 h-screen w-screen bg-dark opacity-70 z-10" onClick={closeCreatePostModal}></div>

            {/* This is the x close btn */}
            <div className="absolute top-2 right-8 text-textGray cursor-pointer z-20" onClick={closeCreatePostModal}>
                <FontAwesomeIcon icon={faXmark} className="text-3xl"/>
            </div>

            {/* The modal */}
            <CreatePostModal />
        </div>);
};
export default CreatePost;
