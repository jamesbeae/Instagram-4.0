import { Like } from "./Like";
import { Post } from "./Post";
import { User } from "./User";

export type Comment = {
    _id: string;
    userId: User;
    postId: Post;
    content: string;
    likes: Like[];
    parentCommentId?: string | null;
    createdAt: Date;
};
