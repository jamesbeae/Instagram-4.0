import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../../hooks/useStore";

const RequireAuth = () => {
    const userInfo = useAppSelector(
        (state) => state.authSlice.userInfo
    );

    const location = useLocation();

    if (!userInfo) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return <Outlet />;
};

export default RequireAuth;