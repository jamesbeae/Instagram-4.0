import { useNavigate } from "react-router-dom";
import {
    faArrowRightFromBracket,
    faChartLine,
    faGear,
    faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import MoreItem from "./MoreItem";
import Card from "../../UI/Card";
import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import { logout } from "../../../services/logoutService";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { authActions } from "../../../lib/redux/authSlice";
import useRedirect from "../../../hooks/useRedirect";
import "./MoreModal.css";
import { useConfirmDiscard } from "../../UnsavedChanges";
import { Link } from "react-router-dom";

export default function MoreModal({ id, onClose }: { id: string; onClose: () => void }) {
    const role = useAppSelector(state => state.authSlice.userInfo?.role?.name);
    const user = useAppSelector(state => state.authSlice.userInfo);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const privateHttp = usePrivateHttp();
    const { gotoLoginPage } = useRedirect();
    const confirmDiscard = useConfirmDiscard();

    function goTo(path: string) {
        onClose();
        navigate(path);
    }

    async function logoutHandler() {
        const result = await logout(privateHttp);
        if (result.success) {
            onClose();
            dispatch(authActions.loggedOut());
            gotoLoginPage();
            return;
        }
        console.error(result.message);
    }

    return (
        <Card id={id} role="group" aria-label="More options" className="sidebar-more-popup">
            <MoreItem title="Creator analytics" icon={faChartLine} onClick={() => goTo("/creator")} />
            <MoreItem title="Account settings" icon={faGear} onClick={() => goTo("/settings")} />
            {role === "admin" && <MoreItem title="Moderation" icon={faShieldHalved} onClick={() => goTo("/admin")} />}
            <div className="sidebar-more-divider">
                {user ? <MoreItem title="Log out" icon={faArrowRightFromBracket} onClick={() => confirmDiscard(() => void logoutHandler())} danger /> : <div className="flex flex-col gap-2 px-2 py-3"><Link to="/login" onClick={onClose} className="rounded-lg bg-blue px-3 py-2 text-center text-white">Log in</Link><Link to="/sign-up" onClick={onClose} className="rounded-lg border border-lightDark px-3 py-2 text-center">Sign up</Link></div>}
            </div>
        </Card>
    );
}
