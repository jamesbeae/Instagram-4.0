import { Post } from "./Post";
import { User } from "./User";

export type Profile = User & {
    posts: Post[];
    reels?: Post[];
    saved?: Post[];
};
