import { useCallback, useEffect, useState } from "react";
import Input from "../../components/UI/Input/Input";
import Button from "../../components/UI/Button/Button";
import loginService from "../../services/loginService";
import { useAppDispatch } from "../../hooks/useStore";
import { authActions } from "../../lib/redux/authSlice";
import useRedirect from "../../hooks/useRedirect";
import FacebookLogin from "react-facebook-login";
const inputClassName =
    "w-64 p-2 border border-textGray rounded-sm focus:outline-none text-sm placeholder:text-sm";
const buttonClassName =
    "w-64 py-2 px-3 rounded-lg font-semibold bg-blue text-white";
const LoginForm = () => {
    const dispatch = useAppDispatch();
    const { gotoHomePage } = useRedirect();
    // Login form data:
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    // Validation states:
    const [errorMess, setErrorMess] = useState<string>("");
    const [disableLoginButton, setDisableLoginButton] = useState<boolean>(true);

    // get inputs value functions:
    const getUsernameHandler = useCallback((value: string) => {
        setUsername(value);
    }, []);
    const getPasswordHandler = useCallback((value: string) => {
        setPassword(value);
    }, []);

    // Disable button state:
    useEffect(() => {
        if (username && password) {
            setDisableLoginButton(false);
        } else {
            setDisableLoginButton(true);
        }
    }, [username, password]);

    // Handle click Login button:
    const handleLogin = useCallback(async () => {
        const loginData = {
            username,
            password,
        };
        const validationResult = loginService.validateLoginData(loginData);

        // Validate Login data
        if (!validationResult.success) {
            setErrorMess(validationResult.error.issues[0].message);
        } else {
            console.log(loginData);
            const result = await loginService.login(loginData);
            // Check the errors sent from server (wrong username or password)
            if (result?.success) {
                dispatch(
                    authActions.loggedIn({
                        userInfo: result.data.userInfo,
                        accessToken: result.data.accessToken,
                    })
                );
                gotoHomePage();
            } else {
                setErrorMess(result?.message ?? "Đăng nhập thất bại");
            }
        }
    }, [username, password, dispatch, gotoHomePage]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLoginWithFacebook = async (response: any) => {
        if (!response.accessToken) {
            setErrorMess("Login with Facebook failed. Please try again later.");
        } else {
            const result = await loginService.loginWithFacebook(response);

            if (result?.success) {
                dispatch(
                    authActions.loggedIn({
                        userInfo: result.data.userInfo,
                        accessToken: result.data.accessToken,
                    })
                );
                gotoHomePage();
            } else {
                setErrorMess(
                    "Login with Facebook failed. Please try again later."
                );
            }
        }
    };

    return (
        <form className="flex flex-col items-center gap-2 mt-8">
            <Input
                className={inputClassName}
                type="text"
                name="username"
                id="username"
                placeholder="Your username"
                getInputValueHandler={getUsernameHandler}
            />

            <Input
                className={inputClassName}
                type="password"
                name="password"
                id="password"
                placeholder="Your password"
                getInputValueHandler={getPasswordHandler}
            />

            <Button
                className={buttonClassName}
                content="Log in"
                disable={disableLoginButton}
                onClick={handleLogin}
            />

            <div
                className="w-64 my-2 flex items-center 
                justify-between text-xs text-textGray before:content-[''] before:h-px before:w-24 before:bg-textGray 
                before:inline-block after:inline-block after:bg-textGray after:content-[''] after:h-px after:w-24"
            >
                OR
            </div>

            <FacebookLogin
                appId={import.meta.env.VITE_FACEBOOK_APP_ID || ""}
                autoLoad={false}
                fields="name,email,picture"
                callback={(response) => {
                    handleLoginWithFacebook(response);
                }}
                cssClass={buttonClassName}
            />

            {errorMess && (
                <div className="mt-4 px-4 text-sm text-errorText text-center">
                    {errorMess}
                </div>
            )}

            <div className="text-xs text-blue mt-3">Forgot password ?</div>
        </form>
    );
};

export default LoginForm;
