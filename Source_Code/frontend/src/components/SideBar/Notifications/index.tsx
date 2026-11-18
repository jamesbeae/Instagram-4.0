import { useAppSelector } from "../../../hooks/useStore";
import type { Notification } from "../../../models/Notification";
import SidebarPanel from "../SidebarPanel";
import NotificationsTag from "./NotificationsTag";

export default function NotificationsModal({ notifications }: { notifications: Notification[] }) {
    const isOpen = useAppSelector(state => state.sideBarSlice.openedModal === "notifications");
    if (!isOpen) return null;

    return (
        <SidebarPanel name="notifications" title="Notifications">
            {notifications.length === 0 && (
                <p className="px-6 text-textSecondGray">No notifications yet.</p>
            )}
            {notifications.map(notification => (
                <NotificationsTag key={notification._id} content={notification.content} />
            ))}
        </SidebarPanel>
    );
}
