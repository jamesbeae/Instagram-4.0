import React from "react";
import Avatar from "../../UI/Avatar/Avatar";
import type { Notification } from "../../../models/Notification";

const NotificationsTag: React.FC<{ notification: Notification; onDismiss: (id: string) => void; onOpen: (notification: Notification) => void }> = ({ notification, onDismiss, onOpen }) => {
    return (
        <div className={`w-full border-b border-lightDark px-4 py-3 ${notification.read ? 'opacity-65' : ''}`}>
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => onOpen(notification)} className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80">
                    <Avatar className="h-11 w-11 shrink-0" avatarUrl={notification.sender?.avatar} username={notification.sender?.username || notification.sender?.fullName} />
                    <span className="min-w-0 flex-1 break-words text-sm text-foreground">{notification.content}</span>
                </button>
                <div className="flex shrink-0 flex-col gap-1 text-xs"><button type="button" onClick={() => onDismiss(notification._id)} className="text-textSecondGray">Dismiss</button></div>
            </div>
        </div>
    );
};

export default NotificationsTag;
