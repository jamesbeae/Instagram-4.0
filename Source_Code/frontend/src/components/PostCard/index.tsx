import Card from "../UI/Card";
import React from "react";
import { Post as PostModel } from "../../models/Post";
import PostContent from "./PostContent";
import PostHeader from "./PostHeader";
import CommentComposer from "../CommentComposer";
const PostCard: React.FC<{
    postData: PostModel;
}> = ({ postData }) => {
<<<<<<< Updated upstream:Source_Code/frontend/src/components/PostCard/index.tsx
    return (<Card as="article" className="feed-card feed-post mb-5">
=======
    return (<article className="home-post pb-5 mb-5 w-full max-w-[600px] border-b border-lightDark border-solid">
>>>>>>> Stashed changes:Source_Code/frontend/src/pages/Home/PostsList/Post/index.tsx
            {/* Post Header */}
            <PostHeader userId={postData.userId._id} avatar={postData.userId.avatar} username={postData.userId.username || postData.userId.fullName} time={postData.createdAt}/>
            {/* Post Content */}
            <PostContent postData={postData}/>

            {/* Post Comment */}
<<<<<<< Updated upstream:Source_Code/frontend/src/components/PostCard/index.tsx
            <CommentComposer postData={postData} postId={postData._id}/>
        </Card>);
=======
            <PostComment postId={postData._id}/>
        </article>);
>>>>>>> Stashed changes:Source_Code/frontend/src/pages/Home/PostsList/Post/index.tsx
};
export default PostCard;
