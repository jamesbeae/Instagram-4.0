import { Outlet } from "react-router-dom";
import SideBar from "../SideBar";
import { useAppSelector } from "../../hooks/useStore";
import PostDetailModal from "../PostDetailModal";
const RootLayout = () => {
    const postDetailSlice = useAppSelector((state) => state.postDetailModalSlice);
    return (<div className="h-screen flex bg-dark">
            <SideBar />
            {postDetailSlice.isOpen && <PostDetailModal />}
            <Outlet />
        </div>);
};
export default RootLayout;
