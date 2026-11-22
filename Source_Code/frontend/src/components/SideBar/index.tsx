import Card from "../UI/Card";
import "./SideBar.css";
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
    const [badgeDismissedIds, setBadgeDismissedIds] = useState<Set<string>>(() => new Set());
    const privateHttp = usePrivateHttp();
    const openedModal = useAppSelector((state) => state.sideBarSlice).openedModal;
    const isSmall = useAppSelector((state) => state.sideBarSlice).isSmall;
    const creatingPost = useAppSelector((state) => state.sideBarSlice).creatingPost;
    const userId = useAppSelector(state => state.authSlice.userInfo?._id);
    const unreadNotificationCount = notifications.reduce((count, item) => count + (!item.read && !badgeDismissedIds.has(item._id) ? 1 : 0), 0);
    const dismissNotificationBadges = () => {
        setBadgeDismissedIds(current => new Set([...current, ...notifications.filter(item => !item.read).map(item => item._id)]));
    };
    const dismissNotification = async (id: string) => {
        try { await privateHttp.delete(`/notification/${id}`); setNotifications(current => current.filter(item => item._id !== id)); }
        catch { /* Keep the item visible so the user can retry. */ }
    };
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!userId) { setNotifications([]); return; }
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
    }, [privateHttp, userId]);
    useEffect(() => {
        const receive = (notification: Notification) => {
            if (!userId) return;
            console.log("Received Notification:", notification);
            setNotifications((prev: Notification[]) => [notification, ...prev]);
        };
        socket.on("receiveNotification", receive);
        return () => {
            socket.off("receiveNotification", receive);
        };
    }, [userId]);
    return (<>
<<<<<<< Updated upstream
            <Card className={`app-sidebar relative z-10 shrink-0 ${openedModal || isSmall ? "w-72px" : "w-60"} flex flex-col px-3 pt-2 pb-5 transition-[width] duration-200 ease-out`}>
=======
            <div className={`app-sidebar legacy-sidebar shrink-0 h-full ${openedModal || isSmall ? "w-72px" : "w-60"} flex flex-col px-3 pt-2 pb-5 border-r-0.5 border-lightDark transition-all delay-300 ease-in`}>
>>>>>>> Stashed changes
                <SideBarLogo />
                <NavigationList unreadNotificationCount={unreadNotificationCount} onNotificationsOpen={dismissNotificationBadges} />
            </Card>
            <SearchModal />
            <NotificationsModal notifications={notifications} onDismiss={id => void dismissNotification(id)} />
            {creatingPost && userId ? <CreatePost /> : null}
        </>);
};
export default SideBar;
