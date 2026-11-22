export type Notification = {
    _id: string;
    type: "LIKE" | "COMMENT" | "COMMENT_LIKE" | "COMMENT_REPLY" | "FOLLOW";
    userId: string;
    senderId?: string;
    postId?: string | null;
    sender?: { _id: string; username?: string; fullName?: string; avatar?: string | null } | null;
    content: string;
    createdAt: Date;
    read: boolean;
};
