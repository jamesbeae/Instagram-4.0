import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import type { Notification } from "../../../models/Notification";
import SidebarPanel from "../SidebarPanel";
import NotificationsTag from "./NotificationsTag";
import { Link, useNavigate } from "react-router-dom";
import { sideBarActions } from "../../../lib/redux/sideBarSlice";

export default function NotificationsModal({ notifications, onDismiss, onRead = async () => true }: { notifications: Notification[]; onDismiss: (id: string) => void; onRead?: (id: string) => Promise<boolean> }) {
    const isOpen = useAppSelector(state => state.sideBarSlice.openedModal === "notifications");
    const user = useAppSelector(state => state.authSlice.userInfo);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    if (!isOpen) return null;

    async function openNotification(notification: Notification) {
        if (!notification.read && !await onRead(notification._id)) return;
        dispatch(sideBarActions.closePanel('notifications'));
        if (notification.type === 'REPORT_RESOLVED') return;
        if (notification.postId) navigate(`/post/${notification.postId}`);
        else {
            const senderId = notification.sender?._id || notification.senderId;
            if (senderId) navigate(`/profile/${senderId}`);
        }
    }

    return (
        <SidebarPanel name="notifications" title="Notifications">
            {!user && <div className="px-6"><p className="mb-3 text-textSecondGray">Log in to see your notifications.</p><Link className="text-blue" to="/login">Log in</Link></div>}
            {user && notifications.length === 0 && (
                <p className="px-6 text-textSecondGray">No notifications yet.</p>
            )}
            {user && notifications.map(notification => (
                <NotificationsTag key={notification._id} notification={notification} onDismiss={onDismiss} onOpen={openNotification} />
            ))}
        </SidebarPanel>
    );
}
