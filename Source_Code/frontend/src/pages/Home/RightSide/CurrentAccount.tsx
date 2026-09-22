import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import UserTagBar from "../../../components/UI/UserTagBar";
import { logout, validateLogoutData } from "../../../services/logoutService";
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
        const _id = authSlice.userInfo?._id;
        if (_id) {
            try {
                const validationResult = validateLogoutData({
                    _id,
                });
                if (!validationResult.success) {
                    console.log(validationResult.error);
                } else {
                    const res = await logout(privateHttp, {
                        _id,
                    });
                    console.log(res);
                    dispatch(authActions.loggedOut(null));
                    gotoLoginPage();
                }
            } catch (error) {
                console.log(error);
            }
        }
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
