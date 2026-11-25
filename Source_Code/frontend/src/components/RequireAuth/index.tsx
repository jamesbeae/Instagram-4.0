import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../../hooks/useStore";

const RequireAuth = ({ adminOnly = false }: { adminOnly?: boolean }) => {
    const userInfo = useAppSelector(
        (state) => state.authSlice.userInfo
    );

    const location = useLocation();

    if (adminOnly && userInfo?.role?.name !== "admin") {
        return <Navigate to="/admin/login" replace />;
    }

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
