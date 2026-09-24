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
        loggedIn: (state, action) => {
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

        loggedOut: () => initialState,
    },
});

export const authActions = authSlice.actions;
export default authSlice;