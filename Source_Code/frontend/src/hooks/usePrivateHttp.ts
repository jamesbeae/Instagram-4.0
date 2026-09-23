import { useEffect } from "react";
import useRefreshToken from "./useRefreshToken";
import { useAppDispatch, useAppSelector } from "./useStore";
import { privateHttp } from "../lib/axios/http";
import { authActions } from "../lib/redux/authSlice";

const usePrivateHttp = () => {
    const accessToken = useAppSelector(
        (state) => state.authSlice.accessToken
    );

    const dispatch = useAppDispatch();
    const refresh = useRefreshToken();

    useEffect(() => {
        const requestIntercept = privateHttp.interceptors.request.use(
            (config) => {
                if (!config.headers.Authorization && accessToken) {
                    config.headers.Authorization =
                        `Bearer ${accessToken}`;
                }

                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseIntercept = privateHttp.interceptors.response.use(
            (response) => response,
            async (error) => {
                const previousRequest = error?.config;

                if (
                    error?.response?.status === 403 &&
                    previousRequest &&
                    !previousRequest.sent
                ) {
                    previousRequest.sent = true;

                    try {
                        const newAccessToken = await refresh();

                        previousRequest.headers.Authorization =
                            `Bearer ${newAccessToken}`;

                        return privateHttp(previousRequest);
                    } catch (refreshError) {
                        dispatch(authActions.loggedOut());
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            privateHttp.interceptors.request.eject(requestIntercept);
            privateHttp.interceptors.response.eject(responseIntercept);
        };
    }, [accessToken, dispatch, refresh]);

    return privateHttp;
};

export default usePrivateHttp;