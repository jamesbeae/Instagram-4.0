import AuthLayout from "../../components/AuthLayout";
import SignUpForm from "./SignUpForm";

export default function SignUp() {
    return (
        <AuthLayout title="Sign up" prompt="Already have an account?" link={{ to: "/login", label: "Log in" }}>
            <SignUpForm />
        </AuthLayout>
    );
}
