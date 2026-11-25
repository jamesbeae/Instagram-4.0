import { Navigate } from "react-router-dom";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AuthLayout from "../../components/AuthLayout";
import { useAppSelector } from "../../hooks/useStore";
import LoginForm from "./LoginForm";
import "./AdminLogin.css";

export default function AdminLogin() {
    const role = useAppSelector(state => state.authSlice.userInfo?.role?.name);
    if (role === "admin") return <Navigate to="/admin" replace />;

    return (
        <AuthLayout title="Admin sign in" className="admin-auth"
            icon={<span className="admin-auth-icon" aria-hidden="true"><FontAwesomeIcon icon={faShieldHalved} /></span>}
            description="Manage reports, content and accounts."
            link={{ to: "/login", label: "Back to log in" }}>
            <LoginForm admin />
        </AuthLayout>
    );
}
