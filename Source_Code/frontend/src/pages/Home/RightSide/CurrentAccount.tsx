import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import UserTagBar from "../../../components/UI/UserTagBar";
import { logout } from "../../../services/logoutService";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { authActions } from "../../../lib/redux/authSlice";
import useRedirect from "../../../hooks/useRedirect";

const CurrentAccountAction = () => {
    const authSlice = useAppSelector((state) => state.authSlice);
    const privateHttp = usePrivateHttp();
    const dispatch = useAppDispatch();

    const { gotoLoginPage } = useRedirect();
    // Logout handler:
    const logoutHandler = async () => {
        const result = await logout(privateHttp);

        if (!result.success) {
            console.error(result.message);
            return;
        }

        dispatch(authActions.loggedOut());
        gotoLoginPage();
    };
    return (
        <div className="flex items-center">
            {
                authSlice.userInfo ? (
                    <div className="text-blue text-xs cursor-pointer hover:opacity-50" onClick={logoutHandler}>
                        Logout
                        </div>) : (
                            <div className="text-blue text-xs cursor-pointer hover:opacity-50" onClick={gotoLoginPage}>
                                Login
                            </div>
                        )
            }
        
        </div>
    );
};

const CurrentAccount = () => {
    const currentUser = useAppSelector((state) => state.authSlice);
    return (
        <div className="">
            <UserTagBar
                _id={currentUser.userInfo?._id}
                username={currentUser.userInfo?.username}
                avatar={currentUser.userInfo?.avatar}
                annotate={currentUser.userInfo?.fullName}
                ActionButton={CurrentAccountAction}
                className="px-4"
                annotateClassName="text-sm"
            />
        </div>
    );
};

export default CurrentAccount;
