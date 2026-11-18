import { useNavigate } from "react-router-dom";
import {
    faArrowRightFromBracket,
    faChartLine,
    faGear,
    faShieldHalved,
    faUsers,
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

export default function MoreModal({ id, onClose }: { id: string; onClose: () => void }) {
    const role = useAppSelector(state => state.authSlice.userInfo?.role?.name);
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
            <MoreItem title="Relation lists" icon={faUsers} onClick={() => goTo("/groups")} />
            <MoreItem title="Creator analytics" icon={faChartLine} onClick={() => goTo("/creator")} />
            <MoreItem title="Account settings" icon={faGear} onClick={() => goTo("/settings")} />
            {role === "admin" && <MoreItem title="Moderation" icon={faShieldHalved} onClick={() => goTo("/admin")} />}
            <div className="sidebar-more-divider">
                <MoreItem title="Log out" icon={faArrowRightFromBracket} onClick={() => confirmDiscard(() => void logoutHandler())} danger />
            </div>
        </Card>
    );
}
