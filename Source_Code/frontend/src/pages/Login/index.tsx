import AuthLayout from "../../components/AuthLayout";
import LoginForm from "./LoginForm";

export default function Login() {
    return (
        <AuthLayout title="Log in" prompt="Don't have an account?" link={{ to: "/sign-up", label: "Sign up" }}>
            <LoginForm />
        </AuthLayout>
    );
}
