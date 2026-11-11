import { createSlice } from "@reduxjs/toolkit";
import { User } from "../../models/User";
type AuthSlice = {
    userInfo: User | undefined;
    accessToken: string;
};
const initialState: AuthSlice = {
    userInfo: undefined,
    accessToken: "",
};
const authSlice = createSlice({
    name: "authSlice",
    initialState,
    reducers: {
        loggedIn: (_state, action) => {
            return {
                userInfo: action.payload.userInfo,
                accessToken: action.payload.accessToken,
            };
        },
        storeNewAccessToken: (state, action) => {
            return {
                ...state,
                accessToken: action.payload,
            };
        },
        profileUpdated: (state, action) => {
            if (state.userInfo) state.userInfo = { ...state.userInfo, ...action.payload };
        },
        loggedOut: () => initialState,
    },
});
export const authActions = authSlice.actions;
export default authSlice;
