import CreatePostModal from "./CreatePostModal";
import { useAppDispatch } from "../../../hooks/useStore";
import { sideBarActions } from "../../../lib/redux/sideBarSlice";

export default function CreatePost() {
    const dispatch = useAppDispatch();
    return <CreatePostModal onClose={() => dispatch(sideBarActions.openCreatePost(false))} />;
}
