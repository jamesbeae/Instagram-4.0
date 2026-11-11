import SideBarLogo from "./SideBarLogo";
import NavigationList from "./NavigationList";
import { useAppSelector } from "../../hooks/useStore";
import SearchModal from "./Search";
import NotificationsModal from "./Notifications";
import CreatePost from "./CreatePost";
import { useEffect, useState } from "react";
import { socket } from "../../socket/socket";
import { Notification } from "../../models/Notification";
import usePrivateHttp from "../../hooks/usePrivateHttp";
const SideBar = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const privateHttp = usePrivateHttp();
    const openedModal = useAppSelector((state) => state.sideBarSlice).openedModal;
    const isSmall = useAppSelector((state) => state.sideBarSlice).isSmall;
    const creatingPost = useAppSelector((state) => state.sideBarSlice).creatingPost;
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await privateHttp.get("/notification/get-all");
                const data = response.data;
                setNotifications(data.notifications);
            }
            catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };
        fetchNotifications();
    }, [privateHttp]);
    useEffect(() => {
        socket.on("receiveNotification", (notification: Notification) => {
            console.log("Received Notification:", notification);
            setNotifications((prev: Notification[]) => [notification, ...prev]);
        });
        return () => {
            socket.off("receiveNotification");
        };
    }, []);
    return (<>
            <div className={`app-sidebar shrink-0 h-full ${openedModal || isSmall ? "w-72px" : "w-60"} flex flex-col px-3 pt-2 pb-5 border-r-0.5 border-lightDark transition-all delay-300 ease-in`}>
                <SideBarLogo />
                <NavigationList />
            </div>
            <SearchModal />
            <NotificationsModal notifications={notifications}/>
            {creatingPost ? <CreatePost /> : null}
        </>);
};
export default SideBar;
