import { configureStore, combineReducers } from "@reduxjs/toolkit";
import sideBarSlice from "./sideBarSlice";
import authSlice from "./authSlice";
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
    type PersistedState,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import postsListSlice from "./postsListSlice";
import postDetailModalSlice from "./postDetailModalSlice";

const persistConfig = {
    key: "root",
    storage,
    whitelist: ["authSlice"],
    blacklist: ["sideBarSlice", "postsListSlice", "postDetailModalSlice"],
};

const sideBarPersistConfig = {
    key: "sideBarSlice",
    storage,
    blacklist: ["creatingPost", "openedModal", "moreModal"],
    migrate: async (state: PersistedState) => state && {
        ...state,
        creatingPost: false,
        openedModal: null,
        moreModal: false,
    },
};

const rootReducer = combineReducers({
    authSlice: authSlice.reducer,
    sideBarSlice: persistReducer(sideBarPersistConfig, sideBarSlice.reducer),
    postsListSlice: postsListSlice.reducer,
    postDetailModalSlice: postDetailModalSlice.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    FLUSH,
                    REHYDRATE,
                    PAUSE,
                    PERSIST,
                    PURGE,
                    REGISTER,
                ],
            },
        }),
});

export const persistor = persistStore(store);
export default store;

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
