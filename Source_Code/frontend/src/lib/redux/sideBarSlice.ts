import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type SidebarPanelName = "search" | "notifications";

type SideBarState = {
    currentPage: "home" | "explore" | "reels" | "message" | "create" | "profile";
    openedModal: SidebarPanelName | null;
    isSmall?: boolean;
    creatingPost: boolean;
    moreModal: boolean;
};

const initialState: SideBarState = {
    currentPage: "home",
    openedModal: null,
    creatingPost: false,
    moreModal: false,
};

const sideBarSlice = createSlice({
    name: "sideBarSlice",
    initialState,
    reducers: {
        selectCurrentPage(state, { payload }: PayloadAction<SideBarState["currentPage"]>) {
            state.isSmall = payload === "message";
            state.currentPage = payload;
            state.openedModal = null;
            state.moreModal = false;
        },
        openModal(state, { payload }: PayloadAction<SidebarPanelName>) {
            state.openedModal = state.openedModal === payload ? null : payload;
            state.moreModal = false;
        },
        closePanel(state, { payload }: PayloadAction<SidebarPanelName>) {
            if (state.openedModal === payload) state.openedModal = null;
        },
        openCreatePost(state, { payload }: PayloadAction<boolean>) {
            state.creatingPost = payload;
            if (payload) {
                state.openedModal = null;
                state.moreModal = false;
            }
        },
        openMoreModal(state, { payload }: PayloadAction<boolean>) {
            state.moreModal = payload;
        },
    },
});

export const sideBarActions = sideBarSlice.actions;
export default sideBarSlice;
