import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { postDetailModalActions } from "../../lib/redux/postDetailModalSlice";
import SideBar from "../SideBar";
import MessageInboxProvider from "./MessageInboxProvider";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import PostDetailModal from "../PostDetailModal";
import AppChrome from "../AppChrome";
const RootLayout = () => {
    const dispatch = useAppDispatch();
    const { pathname, search } = useLocation();
    useEffect(() => () => { dispatch(postDetailModalActions.closePostDetailModal()); }, [dispatch, pathname, search]);
    const postDetailSlice = useAppSelector((state) => state.postDetailModalSlice);
<<<<<<< Updated upstream
    return (<MessageInboxProvider><div className="h-screen flex bg-dark">
            <SideBar />
            {postDetailSlice.isOpen && <PostDetailModal />}
            <Outlet />
        </div></MessageInboxProvider>);
=======
    return (<div className="social-app h-screen flex flex-col bg-dark">
            <AppChrome />
            <div className="app-content flex flex-1 min-h-0 min-w-0">
                <SideBar />
                <Outlet />
            </div>
            {postDetailSlice.isOpen && <PostDetailModal />}
        </div>);
>>>>>>> Stashed changes
};
export default RootLayout;
