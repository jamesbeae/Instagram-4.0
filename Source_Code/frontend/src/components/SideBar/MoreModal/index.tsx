import { useNavigate } from "react-router-dom";
import MoreItem from "./MoreItem";
import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import { logout } from "../../../services/logoutService";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { authActions } from "../../../lib/redux/authSlice";
import useRedirect from "../../../hooks/useRedirect";
const MoreModal = () => {
    const role = useAppSelector(s => s.authSlice.userInfo?.role?.name);
    const navigate = useNavigate();
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
    return (<div className="w-[250px] bg-lightDark p-2 rounded-md flex flex-col absolute -top-[calc(100%+18px)]">
            <MoreItem title="Relation lists" onClick={() => navigate("/groups")}/>
            <MoreItem title="Creator analytics" onClick={() => navigate("/creator")}/>
            <MoreItem title="Account settings" onClick={() => navigate("/settings")}/>
            {role === "admin" && <MoreItem title="Moderation" onClick={() => navigate("/admin")}/>}
            <MoreItem title="Log out" onClick={logoutHandler}/>
        </div>);
};
export default MoreModal;
