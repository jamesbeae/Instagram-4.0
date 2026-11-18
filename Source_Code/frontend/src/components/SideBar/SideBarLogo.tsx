import LogoText from "../UI/Logo/LogoText";
import LogoImg from "../UI/Logo/LogoImg";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import useRedirect from "../../hooks/useRedirect";
import { sideBarActions } from "../../lib/redux/sideBarSlice";

const SideBarLogo = () => {
    const sideBarSlice = useAppSelector((state) => state.sideBarSlice);
    const openedModal = sideBarSlice.openedModal;
    const isSmall = sideBarSlice.isSmall;
    const { gotoHomePage } = useRedirect();
    const dispatch = useAppDispatch();
    return (
        <div
            className="relative mb-5 px-3 pt-6 pb-4 cursor-pointer"
            onClick={() => { dispatch(sideBarActions.selectCurrentPage("home")); gotoHomePage(); }}
        >
            <div
                className={`${
                    openedModal || isSmall ? "scale-100" : "scale-0"
                } absolute transition-all ease-in delay-200`}
            >
                <LogoImg />
            </div>
            <div
                className={`${
                    openedModal || isSmall ? "opacity-0" : "opacity-100"
                } transition-all ease-in delay-200`}
            >
                <LogoText size="small" />
            </div>
        </div>
    );
};

export default SideBarLogo;
