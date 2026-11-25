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
    const markNotificationRead = async (id: string) => {
        try {
            await privateHttp.patch(`/notification/${id}/read`);
            setNotifications(current => current.map(item => item._id === id ? { ...item, read: true } : item));
            setBadgeDismissedIds(current => { const next = new Set(current); next.delete(id); return next; });
            return true;
        } catch { return false; }
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
            <div className="sidebar-slot">
                <Card className="app-sidebar sidebar-hover-expand relative z-10 flex shrink-0 flex-col px-3 pt-2 pb-5">
                    <SideBarLogo />
                    <NavigationList unreadNotificationCount={unreadNotificationCount} onNotificationsOpen={dismissNotificationBadges} />
                </Card>
            </div>
            <SearchModal />
            <NotificationsModal notifications={notifications} onDismiss={id => void dismissNotification(id)} onRead={markNotificationRead} />
            {creatingPost && userId ? <CreatePost /> : null}
        </>);
};
export default SideBar;
