import { useCallback, useEffect, useId, useRef } from "react";
import Button from "../../UI/Button/Button";
import NavigationItem from "./NavigationItem";
import HomeIcon from "../../UI/Icons/HomeIcon";
import SearchIcon from "../../UI/Icons/SearchIcon";
import ExploreIcon from "../../UI/Icons/ExploreIcon";
import ReelsIcon from "../../UI/Icons/ReelsIcon";
import MessageIcon from "../../UI/Icons/MessageIcon";
import NotificationIcon from "../../UI/Icons/NotificationIcon";
import CreateIcon from "../../UI/Icons/CreateIcon";
import SettingIcon from "../../UI/Icons/SettingIcon";
import { useAppDispatch, useAppSelector } from "../../../hooks/useStore";
import { sideBarActions } from "../../../lib/redux/sideBarSlice";
import useRedirect from "../../../hooks/useRedirect";
import { useNavigate } from "react-router-dom";
import Avatar from "../../UI/Avatar/Avatar";
import MoreModal from "../MoreModal";
const NavigationList = () => {
    const navigate = useNavigate();
    const authSlice = useAppSelector((state) => state.authSlice);
    const userInfo = authSlice.userInfo;
    const sideBarSlice = useAppSelector((state) => state.sideBarSlice);
    const dispatch = useAppDispatch();
    const moreModalRef = useRef<HTMLDivElement>(null);
    const moreButtonRef = useRef<HTMLButtonElement>(null);
    const morePopupId = useId();
    const isMoreOpen = sideBarSlice.moreModal;
    const isCompact = sideBarSlice.isSmall || sideBarSlice.openedModal;
    const { gotoHomePage, gotoProfilePage, gotoMessagePage } = useRedirect();
    // Functions to handle navigation items that redirect to another pages clicked:
    const clickRedirect = useCallback((page: string) => {
        page = page.toLowerCase();
        dispatch(sideBarActions.selectCurrentPage(page));
        switch (page) {
            case "explore":
            case "reels":
                navigate("/" + page);
                break;
            case "home":
                gotoHomePage();
                break;
            case "profile":
                gotoProfilePage(userInfo?._id);
                break;
            case "message":
                gotoMessagePage();
                break;
            default:
                break;
        }
    }, [dispatch, navigate, userInfo?._id, gotoHomePage, gotoProfilePage, gotoMessagePage]);
    // function to handle when user click search or notifications:
    const clickOpenModal = useCallback((modal: string) => {
        modal = modal.toLowerCase();
        switch (modal) {
            case "search":
                dispatch(sideBarActions.openModal("search"));
                break;
            case "notifications":
                console.log(modal);
                dispatch(sideBarActions.openModal("notifications"));
                break;
            default:
                break;
        }
    }, []);
    const openCreateModalHandler = useCallback((title: string) => {
        console.log(title);
        dispatch(sideBarActions.openCreatePost(true));
    }, [dispatch]);
    const closeMore = useCallback(() => {
        dispatch(sideBarActions.openMoreModal(false));
    }, [dispatch]);

    useEffect(() => {
        if (!isMoreOpen) return;

        function handleOutsidePointer(event: PointerEvent) {
            if (event.target instanceof Node && !moreModalRef.current?.contains(event.target)) closeMore();
        }

        document.addEventListener("pointerdown", handleOutsidePointer);
        return () => document.removeEventListener("pointerdown", handleOutsidePointer);
    }, [closeMore, isMoreOpen]);
    return (<div className="flex flex-col justify-between h-full text-white">
            <div className="flex flex-col h-full">
                <NavigationItem icon={<HomeIcon />} title="Home" onClick={clickRedirect}/>
                <NavigationItem icon={<SearchIcon />} title="Search" onClick={clickOpenModal}/>
                <NavigationItem icon={<ExploreIcon />} title="Explore" onClick={clickRedirect}/>
                <NavigationItem icon={<ReelsIcon />} title="Reels" onClick={clickRedirect}/>
                <NavigationItem icon={<MessageIcon />} title="Message" onClick={clickRedirect}/>
                <NavigationItem icon={<NotificationIcon />} title="Notifications" onClick={clickOpenModal}/>
                <NavigationItem icon={<CreateIcon />} title="Create" onClick={openCreateModalHandler}/>
                {userInfo && (<NavigationItem icon={<Avatar avatarUrl={userInfo.avatar} username={userInfo.username} className="w-6 h-6 rounded-full"/>} title={"Profile"} onClick={clickRedirect}/>)}

                <div className="mt-auto">
                    <div ref={moreModalRef} className={`relative ${isCompact ? "sidebar-more-compact" : ""}`}
                        onBlur={event => {
                            if (isMoreOpen && !event.currentTarget.contains(event.relatedTarget)) closeMore();
                        }}
                        onKeyDown={event => {
                            if (event.key !== "Escape" || !isMoreOpen) return;
                            event.stopPropagation();
                            closeMore();
                            moreButtonRef.current?.focus();
                        }}>
                        <Button ref={moreButtonRef} aria-label="More" aria-expanded={isMoreOpen}
                            aria-controls={isMoreOpen ? morePopupId : undefined}
                            className="sidebar-more-trigger group mt-0.5 flex w-full items-center gap-4 rounded-[14px] border border-transparent p-3 hover:bg-lightSecondDark"
                            onClick={() => dispatch(sideBarActions.openMoreModal(!isMoreOpen))}>
                            <span className="transition-transform group-hover:scale-105"><SettingIcon /></span>
                            {!isCompact && <span className="navigation-label text-base font-normal">More</span>}
                        </Button>
                        {isMoreOpen && <MoreModal id={morePopupId} onClose={closeMore} />}
                    </div>
                </div>
            </div>
        </div>);
};
export default NavigationList;
