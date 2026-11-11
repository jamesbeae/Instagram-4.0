const SignUpFormDesc = () => {
    return (<p className="my-3 mx-12 flex flex-col items-center gap-4 text-textGray text-xs text-center">
            <span>
                People who use our service may have uploaded your contact
                information to Instagram.
                <a className="text-blue" href="#">
                    {" "}
                    Learn More
                </a>
            </span>
            <span>
                By signing up, you agree to our{" "}
                <a className="text-blue" href="#">
                    Term
                </a>
                ,{" "}
                <a className="text-blue" href="#">
                    Privacy Policy
                </a>{" "}
                and{" "}
                <a className="text-blue" href="#">
                    Cookies
                </a>
            </span>
        </p>);
};
export default SignUpFormDesc;
