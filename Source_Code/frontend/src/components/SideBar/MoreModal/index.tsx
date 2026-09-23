import MoreItem from "./MoreItem";
import { useAppDispatch } from "../../../hooks/useStore";
import { logout } from "../../../services/logoutService";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { authActions } from "../../../lib/redux/authSlice";
import useRedirect from "../../../hooks/useRedirect";

const MoreModal = () => {
    const dispatch = useAppDispatch();
    const privateHttp = usePrivateHttp();
    const { gotoLoginPage } = useRedirect();

    const logoutHandler = async () => {
        const result = await logout(privateHttp);

        if (result.success) {
            dispatch(authActions.loggedOut());
            gotoLoginPage();
            return;
        }

        console.error(result.message);
    };

    return (
        <div className="w-[250px] bg-lightDark p-2 rounded-md flex flex-col absolute -top-[calc(100%+18px)]">
            <MoreItem title="Log out" onClick={logoutHandler} />
        </div>
    );
};

export default MoreModal;