import React, { useReducer, createContext } from "react";
import { Post } from "../../../models/Post";
import { Comment } from "../../../models/Comment";
import UserTagBar from "../../UI/UserTagBar";
import CommentsList from "./CommentsList";
import PostActions from "./PostActions";
import PostManagement from "../../PostManagement";
import "../PostDetailModal.css";
const ADD_COMMENT = "ADD_COMMENT";
const SET_COMMENTS = "SET_COMMENTS";
const initialCommentListState: {
    commentsList: Comment[];
} = {
    commentsList: [],
};
interface CommentListContextType {
    commentListState: typeof initialCommentListState;
    commentListDispatch: React.Dispatch<any>;
}
export const CommentListContext = createContext<CommentListContextType>({
    commentListState: initialCommentListState,
    commentListDispatch: () => { },
});
const PostDescription: React.FC<{
    postData: Post;
}> = ({ postData }) => {
    const commentReducer = (state: typeof initialCommentListState, action: any) => {
        switch (action.type) {
            case ADD_COMMENT:
                return {
                    ...state,
                    commentsList: [action.payload, ...state.commentsList.filter(c => c._id !== action.payload._id)],
                };
            case SET_COMMENTS:
                return {
                    ...state,
                    commentsList: [...new Map([...action.payload, ...state.commentsList].map((comment: Comment) => [comment._id, comment])).values()],
                };
            default:
                return state;
        }
    };
    const [commentListState, commentListDispatch] = useReducer(commentReducer, { ...initialCommentListState, commentsList: postData.comments || [] });
    return (<CommentListContext.Provider value={{ commentListState, commentListDispatch }}>
            <div className="post-detail-panel text-white w-full md:w-[405px] max-w-[500px] flex flex-col min-h-0">
                {/* Post Header */}
                <div className="py-[14px] pl-4 pr-1 border-l border-lightDark border-b rounded-sm">
                    <UserTagBar _id={postData.userId._id} username={postData.userId.username} avatar={postData.userId.avatar} avatarClassName="w-[32px] h[32px]"/>
                </div>
                <PostManagement post={postData}/>
                <div className="relative flex-1 min-h-0">
                    <CommentsList postData={postData}/>
                </div>
                <div>
                    <PostActions postData={postData}/>
                </div>
            </div>
        </CommentListContext.Provider>);
};
export default PostDescription;
