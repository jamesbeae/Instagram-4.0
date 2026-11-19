import React from "react";
import { Post } from "../../../models/Post";
import ProfilePost from "./ProfilePost";

const ProfilePostGrid: React.FC<{ posts: Post[] }> = ({ posts }) => {
    return (
        <div className="grid grid-cols-3 gap-4">
            {posts.length > 0 ? (
                posts.map((post) => {
                    return <ProfilePost key={post._id} post={post} />;
                })
            ) : (
                <div className="text-center text-foreground font-bold text-4xl mt-4 col-span-full">
                    No posts yet
                </div>
            )}
        </div>
    );
};

export default ProfilePostGrid;
