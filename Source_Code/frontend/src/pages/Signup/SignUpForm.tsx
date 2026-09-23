import { useState, useCallback, useEffect } from "react";
import Input from "../../components/UI/Input/Input";
import Button from "../../components/UI/Button/Button";
import { signUp, validateSignUpData } from "../../services/signupService";
import SignUpFormDesc from "./SignUpFormDesc";
import loginService from "../../services/loginService";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../hooks/useStore";
import { authActions } from "../../lib/redux/authSlice";
import useRedirect from "../../hooks/useRedirect";
import ReactFacebookLogin from "react-facebook-login";

const inputClassName =
    "w-64 p-2 border border-textGray rounded-sm focus:outline-none text-sm placeholder:text-sm";
const buttonClassName =
    "w-64 py-2 px-3 rounded-lg font-semibold bg-blue text-white";

const SignUpForm = () => {
    const { gotoHomePage } = useRedirect();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    // Sign up form data:
    const [email, setEmail] = useState<string>("");
    const [fullName, setFullName] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    // validation states:
    const [errorMess, setErrorMess] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [disableSignUpButton, setDisableSignUpButton] =
        useState<boolean>(true);

    // Get inputs value functions:
    const getEmailHandler = useCallback((value: string) => {
        setEmail(value);
    }, []);
    const getFullNameHandler = useCallback((value: string) => {
        setFullName(value);
    }, []);
    const getUsernameHandler = useCallback((value: string) => {
        setUsername(value);
    }, []);
    const getPasswordHandler = useCallback((value: string) => {
        setPassword(value);
    }, []);

    // Disable button state:
    useEffect(() => {
        setDisableSignUpButton(
            email && fullName && username && password ? false : true
        );
        return () => {};
    }, [email, fullName, username, password]);

    // Handle Sign up when click sign up button
        const handleSignUp = useCallback(async () => {
        const signUpData = {
            email,
            fullName,
            username,
            password,
        };

        const validationResult = validateSignUpData(signUpData);

        if (!validationResult.success) {
            setErrorMess(validationResult.error.issues[0].message);
            return;
        }

        setIsSubmitting(true);
        setErrorMess("");

        try {
            const result = await signUp(signUpData);

            if (result.success) {
                navigate("/login");
                return;
            }

            if (result.message === "username") {
                setErrorMess("Username đã tồn tại");
            } else if (result.message === "email") {
                setErrorMess("Email đã tồn tại");
            } else {
                setErrorMess(result.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [email, fullName, username, password, navigate]);

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
        <form action="#" className="flex flex-col items-center gap-2">
            <ReactFacebookLogin
                appId={import.meta.env.VITE_FACEBOOK_APP_ID || ""}
                autoLoad={false}
                fields="name,email,picture"
                callback={(response) => {
                    handleLoginWithFacebook(response);
                }}
                cssClass={buttonClassName}
            />
            <div
                className="w-64 my-2 flex items-center 
                justify-between text-xs text-textGray before:content-[''] before:h-px before:w-24 before:bg-textGray 
                before:inline-block after:inline-block after:bg-textGray after:content-[''] after:h-px after:w-24"
            >
                OR
            </div>
            <Input
                type="email"
                name="email"
                id="email"
                placeholder="Email"
                getInputValueHandler={getEmailHandler}
                className={inputClassName}
            />
            <Input
                type="text"
                name="fullName"
                id="fullName"
                placeholder="Full Name"
                getInputValueHandler={getFullNameHandler}
                className={inputClassName}
            />
            <Input
                type="text"
                name="username"
                id="username"
                placeholder="Username"
                getInputValueHandler={getUsernameHandler}
                className={inputClassName}
            />
            <Input
                type="password"
                name="password"
                id="password"
                placeholder="Password"
                getInputValueHandler={getPasswordHandler}
                className={inputClassName}
            />
            {/* Sign up form description */}
            <SignUpFormDesc />
            <Button
                onClick={handleSignUp}
                content={isSubmitting ? "Đang đăng ký..." : "Sign Up"}
                disable={disableSignUpButton || isSubmitting}
                className={buttonClassName}
            />
            {errorMess && (
                <div className="mt-4 px-4 text-sm text-errorText text-center">
                    {errorMess}
                </div>
            )}
        </form>
    );
};

export default SignUpForm;
