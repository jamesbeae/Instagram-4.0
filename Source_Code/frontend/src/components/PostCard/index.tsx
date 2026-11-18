import Card from "../UI/Card";
import React from "react";
import { Post as PostModel } from "../../models/Post";
import PostContent from "./PostContent";
import PostHeader from "./PostHeader";
import CommentComposer from "../CommentComposer";
const PostCard: React.FC<{
    postData: PostModel;
}> = ({ postData }) => {
    return (<Card as="article" className="feed-card feed-post mb-5">
            {/* Post Header */}
            <PostHeader userId={postData.userId._id} avatar={postData.userId.avatar} username={postData.userId.username || postData.userId.fullName} time={postData.createdAt}/>
            {/* Post Content */}
            <PostContent postData={postData}/>

            {/* Post Comment */}
            <CommentComposer postData={postData} postId={postData._id}/>
        </Card>);
};
export default PostCard;
