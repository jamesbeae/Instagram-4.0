import React from "react";
import { Post as PostModel } from "../../../../models/Post";
import PostContent from "./PostContent";
import PostHeader from "./PostHeader";
import PostComment from "./PostComment";
const Post: React.FC<{
    postData: PostModel;
}> = ({ postData }) => {
    return (<div className="pb-5 mb-5 w-full max-w-[468px] border-b border-lightDark border-solid">
            {/* Post Header */}
            <PostHeader userId={postData.userId._id} avatar={postData.userId.avatar} username={postData.userId.username || postData.userId.fullName} time={postData.createdAt}/>
            {/* Post Content */}
            <PostContent postData={postData}/>

            {/* Post Comment */}
            <PostComment postId={postData._id}/>
        </div>);
};
export default Post;
