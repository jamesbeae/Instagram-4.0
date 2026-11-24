import { createSlice } from "@reduxjs/toolkit";
import { Post } from "../../models/Post";
type PostDetailModalSlice = {
    isOpen: boolean;
    post: Post | null;
    prePath: string | null;
    storyGroups: Post[][] | null;
    storyGroupIndex: number;
};
const initialState: PostDetailModalSlice = {
    isOpen: false,
    post: null,
    prePath: null,
    storyGroups: null,
    storyGroupIndex: 0,
};
const postDetailModalSlice = createSlice({
    name: "postDetailModal",
    initialState: initialState,
    reducers: {
        openPostDetailModal: (_state, action) => {
            return {
                isOpen: true,
                post: action.payload.post,
                prePath: action.payload.prePath,
                storyGroups: action.payload.storyGroups || null,
                storyGroupIndex: action.payload.storyGroupIndex || 0,
            };
        },
        closePostDetailModal: (_state) => {
            return initialState;
        },
    },
});
export const postDetailModalActions = postDetailModalSlice.actions;
export default postDetailModalSlice;
