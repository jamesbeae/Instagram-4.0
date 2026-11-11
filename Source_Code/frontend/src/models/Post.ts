import { Like } from "./Like";
import { PhotoVideo } from "./PhotoVideo";
import { User } from "./User";
import { Comment } from "./Comment";
export type Post = {
    _id: string;
    isSaved?: boolean;
    kind?: "POST" | "STORY";
    visibility?: "public" | "followers" | "group";
    caption: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId: User;
    photoVideo: PhotoVideo[];
    likes: Like[];
    comments: Comment[];
};
