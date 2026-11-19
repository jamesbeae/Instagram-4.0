import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import FacebookLogin, { type ReactFacebookLoginProps } from "react-facebook-login";
import Input from "../../components/UI/Input/Input";
import Button from "../../components/UI/Button/Button";
import { useUnsavedChanges } from "../../components/UnsavedChanges";
import { signUp, validateSignUpData } from "../../services/signupService";
import loginService from "../../services/loginService";
import { useAppDispatch } from "../../hooks/useStore";
import { authActions } from "../../lib/redux/authSlice";

export default function SignUpForm() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { markSaved } = useUnsavedChanges(Boolean(email || fullName || username || password || confirmPassword));
    const canSubmit = Boolean(email && fullName && username && password && confirmPassword) && !isSubmitting;

    async function handleSignUp(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;

        const validation = validateSignUpData({ email, fullName, username, password, confirmPassword });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            const result = await signUp(validation.data);
            if (result.success) {
                markSaved();
                navigate("/login");
            } else if (result.message === "username") {
                setError("Username đã tồn tại");
            } else if (result.message === "email") {
                setError("Email đã tồn tại");
            } else {
                setError(result.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleFacebookLogin(response: Parameters<ReactFacebookLoginProps["callback"]>[0]) {
        if (response && "accessToken" in response && response.accessToken) {
            const result = await loginService.loginWithFacebook(response);
            if (result?.success) {
                markSaved();
                dispatch(authActions.loggedIn({
                    userInfo: result.data.userInfo,
                    accessToken: result.data.accessToken,
                }));
                navigate("/");
                return;
            }
        }
        setError("Login with Facebook failed. Please try again later.");
    }

    return (
        <div className="auth-form">
            <form className="auth-form" onSubmit={handleSignUp} noValidate>
                <Input className="auth-input" type="email" name="email" id="email" autoComplete="email"
                    placeholder="Email" aria-label="Email" disabled={isSubmitting} getInputValueHandler={setEmail} />
                <Input className="auth-input" type="text" name="fullName" id="fullName" autoComplete="name"
                    placeholder="Full Name" aria-label="Full name" disabled={isSubmitting} getInputValueHandler={setFullName} />
                <Input className="auth-input" type="text" name="username" id="username" autoComplete="username"
                    placeholder="Username" aria-label="Username" disabled={isSubmitting} getInputValueHandler={setUsername} />
                <Input className="auth-input" type="password" name="password" id="password" autoComplete="new-password"
                    placeholder="Password" aria-label="Password" disabled={isSubmitting} getInputValueHandler={setPassword} />
                <Input className="auth-input" type="password" name="confirmPassword" id="confirmPassword" autoComplete="new-password"
                    placeholder="Confirm Password" aria-label="Confirm password" disabled={isSubmitting} getInputValueHandler={setConfirmPassword} />
                {error && <p role="alert" className="text-sm text-errorText">{error}</p>}
                <Button className="auth-submit" type="submit" disabled={!canSubmit}>
                    {isSubmitting ? "Đang đăng ký..." : "Sign up"}
                </Button>
            </form>
            {import.meta.env.VITE_ENABLE_FACEBOOK_LOGIN === "true" && (
                <div className="auth-social">
                    <FacebookLogin appId={import.meta.env.VITE_FACEBOOK_APP_ID || ""} autoLoad={false}
                        fields="name,email,picture" callback={handleFacebookLogin} cssClass="auth-submit" />
                </div>
            )}
        </div>
    );
}
