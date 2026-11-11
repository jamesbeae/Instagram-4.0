import { Post } from "../../models/Post";
import { createSlice } from "@reduxjs/toolkit";
const initialState: Post[] = [];
const postsListSlice = createSlice({
    name: "postsListSlice",
    initialState: initialState,
    reducers: {
        addPosts: (_state, action) => {
            return action.payload;
        },
        appendPosts: (state, action) => { const ids = new Set(state.map(p => p._id)); state.push(...action.payload.filter((p: Post) => !ids.has(p._id))); },
        addPost: (state, action) => {
            state.unshift(action.payload);
        },
        updatePost: (state, action) => {
            const index = state.findIndex((post) => post._id === action.payload._id);
            if (index >= 0)
                state[index] = action.payload;
        },
        deletePost: (state, action) => {
            return state.filter((post) => post._id !== action.payload);
        },
    },
});
export const postsListActions = postsListSlice.actions;
export default postsListSlice;
