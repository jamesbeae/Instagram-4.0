import LogoText from "../UI/Logo/LogoText";
import LogoImg from "../UI/Logo/LogoImg";
import { useAppDispatch } from "../../hooks/useStore";
import useRedirect from "../../hooks/useRedirect";
import { sideBarActions } from "../../lib/redux/sideBarSlice";

const SideBarLogo = () => {
    const { gotoHomePage } = useRedirect();
    const dispatch = useAppDispatch();
    return (
        <div
            className="sidebar-brand relative mb-5 cursor-pointer"
            onClick={() => { dispatch(sideBarActions.selectCurrentPage("home")); gotoHomePage(); }}
        >
            <div className="sidebar-brand-icon">
                <LogoImg />
            </div>
            <div className="sidebar-brand-wordmark">
                <LogoText size="small" />
            </div>
        </div>
    );
};

export default SideBarLogo;
