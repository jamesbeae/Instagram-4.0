import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import FacebookLogin, { type ReactFacebookLoginProps } from "react-facebook-login";
import Input from "../../components/UI/Input/Input";
import Button from "../../components/UI/Button/Button";
import { useUnsavedChanges } from "../../components/UnsavedChanges";
import loginService from "../../services/loginService";
import { useAppDispatch } from "../../hooks/useStore";
import { authActions } from "../../lib/redux/authSlice";

export default function LoginForm() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { markSaved } = useUnsavedChanges(email !== "" || password !== "");
    const canSubmit = Boolean(email && password) && !isSubmitting;

    function completeLogin(data: Parameters<typeof authActions.loggedIn>[0]) {
        markSaved();
        dispatch(authActions.loggedIn(data));
        navigate(data.userInfo?.role?.name === "admin" ? "/admin" : "/");
    }

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;

        const validation = loginService.validateLoginData({ email, password });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            const result = await loginService.login(validation.data);
            if (result?.success) completeLogin(result.data);
            else setError(result?.message ?? "Đăng nhập thất bại");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleFacebookLogin(response: Parameters<ReactFacebookLoginProps["callback"]>[0]) {
        if (response && "accessToken" in response && response.accessToken) {
            const result = await loginService.loginWithFacebook(response);
            if (result?.success) {
                completeLogin(result.data);
                return;
            }
        }
        setError("Login with Facebook failed. Please try again later.");
    }

    return (
        <div className="auth-form">
            <form className="auth-form" onSubmit={handleLogin} noValidate>
                <Input className="auth-input" type="email" name="email" id="email" autoComplete="username"
                    placeholder="Email" aria-label="Email" disabled={isSubmitting} getInputValueHandler={setEmail} />
                <Input className="auth-input" type="password" name="password" id="password" autoComplete="current-password"
                    placeholder="Your password" aria-label="Password" disabled={isSubmitting} getInputValueHandler={setPassword} />
                <Link to="/forgot-password" className="auth-recovery">Forgot password?</Link>
                {error && <p role="alert" className="text-sm text-errorText">{error}</p>}
                <Button className="auth-submit" type="submit" disabled={!canSubmit}>
                    {isSubmitting ? "Logging in…" : "Log in"}
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
