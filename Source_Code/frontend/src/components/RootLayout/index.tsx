import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { postDetailModalActions } from "../../lib/redux/postDetailModalSlice";
import SideBar from "../SideBar";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import PostDetailModal from "../PostDetailModal";
const RootLayout = () => {
    const dispatch = useAppDispatch();
    const { pathname, search } = useLocation();
    useEffect(() => () => { dispatch(postDetailModalActions.closePostDetailModal()); }, [dispatch, pathname, search]);
    const postDetailSlice = useAppSelector((state) => state.postDetailModalSlice);
    return (<div className="h-screen flex bg-dark">
            <SideBar />
            {postDetailSlice.isOpen && <PostDetailModal />}
            <Outlet />
        </div>);
};
export default RootLayout;
