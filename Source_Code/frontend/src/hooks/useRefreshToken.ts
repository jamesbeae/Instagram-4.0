import { useCallback } from "react";
import http from "../lib/axios/http";
import { authActions } from "../lib/redux/authSlice";
import { useAppDispatch } from "./useStore";

const useRefreshToken = () => {
    const dispatch = useAppDispatch();

    const refresh = useCallback(async () => {
        const response = await http.get("/auth/refresh-access-token");

        const accessToken = response.data.newAccessToken;

        dispatch(authActions.storeNewAccessToken(accessToken));

        return accessToken;
    }, [dispatch]);

    return refresh;
};

export default useRefreshToken;