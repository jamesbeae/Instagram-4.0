import React from "react";
import { useAppSelector } from "../../../hooks/useStore";
import NotificationsTag from "./NotificationsTag";
import { Notification } from "../../../models/Notification";

const NotificationsModal: React.FC<{ notifications: Notification[] }> = ({
    notifications,
}) => {
    const openedModal = useAppSelector(
        (state) => state.sideBarSlice
    ).openedModal;
    return (
        <div
            className={`${
                openedModal === "notifications"
                    ? "w-[min(384px,calc(100vw-88px))] border-r-0.5"
                    : "w-0 border-0"
            } h-full py-2 flex flex-col bg-dark transition-all ease-in delay-300
            overflow-hidden rounded-3xl  border-lightDark`}
        >
            <h2 className="pt-3 pb-9 pr-4 pl-6 text-2xl text-white font-semibold">
                Notifications
            </h2>
            {notifications.map((notification) => (
                <NotificationsTag
                    key={notification._id}
                    content={notification.content}
                />
            ))}
        </div>
    );
};

export default NotificationsModal;
