import { Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import LoginForm from "./LoginForm";

export default function Login() {
    return (
        <AuthLayout title="Log in" prompt="Don't have an account?" link={{ to: "/sign-up", label: "Sign up" }}>
            <LoginForm />
            <p className="auth-switch"><Link to="/admin/login">Admin sign in</Link></p>
        </AuthLayout>
    );
}
