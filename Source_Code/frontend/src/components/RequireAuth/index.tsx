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

    if (location.pathname.startsWith("/admin") && userInfo.role?.name !== "admin") {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default RequireAuth;
