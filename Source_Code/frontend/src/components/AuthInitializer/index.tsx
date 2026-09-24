import { ReactNode, useEffect, useState } from "react";
import http from "../../lib/axios/http";
import { useAppDispatch } from "../../hooks/useStore";
import { authActions } from "../../lib/redux/authSlice";

type AuthInitializerProps = {
    children: ReactNode;
};

const AuthInitializer = ({ children }: AuthInitializerProps) => {
    const dispatch = useAppDispatch();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const refreshResponse = await http.get(
                    "/auth/refresh-access-token"
                );

                const accessToken = refreshResponse.data.newAccessToken;

                const meResponse = await http.get("/auth/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                dispatch(
                    authActions.loggedIn({
                        userInfo: meResponse.data.userInfo,
                        accessToken,
                    })
                );
            } catch {
                dispatch(authActions.loggedOut());
            } finally {
                setIsReady(true);
            }
        };

        initializeAuth();
    }, [dispatch]);

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading...
            </div>
        );
    }

    return children;
};

export default AuthInitializer;