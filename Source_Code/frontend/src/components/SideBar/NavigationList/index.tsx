import { useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MoreModal from "../MoreModal";
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
import Avatar from "../../UI/Avatar/Avatar";

export default function NavigationList() {
    const navigate = useNavigate();
    const user = useAppSelector(state => state.authSlice.userInfo);
    const dispatch = useAppDispatch();
    const { moreModal, isSmall, openedModal } = useAppSelector(state => state.sideBarSlice);
    const isCompact = isSmall || openedModal;
    const moreRoot = useRef<HTMLDivElement>(null);
    const moreTrigger = useRef<HTMLButtonElement>(null);
    const moreId = useId();

    useEffect(() => {
        if (!moreModal) return;

        function closeOnOutsideClick(event: PointerEvent) {
            if (event.target instanceof Node && !moreRoot.current?.contains(event.target)) {
                dispatch(sideBarActions.openMoreModal(false));
            }
        }

        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, [dispatch, moreModal]);
    const { gotoHomePage, gotoProfilePage, gotoMessagePage } = useRedirect();

    function goTo(page: "home" | "explore" | "reels" | "message" | "profile", action: () => void) {
        dispatch(sideBarActions.selectCurrentPage(page));
        action();
    }

    return (
        <nav aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col text-white">
            <NavigationItem icon={<HomeIcon />} title="Home" onClick={() => goTo("home", gotoHomePage)} />
            <NavigationItem icon={<SearchIcon />} title="Search" panel="search"
                onClick={() => dispatch(sideBarActions.openModal("search"))} />
            <NavigationItem icon={<ExploreIcon />} title="Explore" onClick={() => goTo("explore", () => navigate("/explore"))} />
            <NavigationItem icon={<ReelsIcon />} title="Reels" onClick={() => goTo("reels", () => navigate("/reels"))} />
            <NavigationItem icon={<MessageIcon />} title="Message" onClick={() => goTo("message", () => gotoMessagePage())} />
            <NavigationItem icon={<NotificationIcon />} title="Notifications" panel="notifications"
                onClick={() => dispatch(sideBarActions.openModal("notifications"))} />
            <NavigationItem icon={<CreateIcon />} title="Create" onClick={() => dispatch(sideBarActions.openCreatePost(true))} />
            {user && (
                <NavigationItem icon={<Avatar avatarUrl={user.avatar} username={user.username} className="h-6 w-6 rounded-full" />}
                    title="Profile" onClick={() => goTo("profile", () => gotoProfilePage(user._id))} />
            )}
            <div className="mt-auto">
                <div ref={moreRoot} className={`relative ${isCompact ? "sidebar-more-compact" : ""}`}
                    onBlur={event => {
                        if (moreModal && !event.currentTarget.contains(event.relatedTarget)) {
                            dispatch(sideBarActions.openMoreModal(false));
                        }
                    }}
                    onKeyDown={event => {
                        if (event.key !== "Escape" || !moreModal) return;
                        event.stopPropagation();
                        dispatch(sideBarActions.openMoreModal(false));
                        moreTrigger.current?.focus();
                    }}>
                    <Button ref={moreTrigger} aria-label="More" aria-expanded={moreModal}
                        aria-controls={moreModal ? moreId : undefined}
                        className={`sidebar-nav-item sidebar-more-trigger group mt-0.5 flex w-full items-center gap-4 rounded-[14px] border border-transparent py-3 hover:bg-lightSecondDark ${isCompact ? "justify-center" : "px-3"}`}
                        onClick={() => dispatch(sideBarActions.openMoreModal(!moreModal))}>
                        <span className="transition-transform group-hover:scale-105"><SettingIcon /></span>
                        {!isCompact && <span className="navigation-label text-base font-normal">More</span>}
                    </Button>
                    {moreModal && <MoreModal id={moreId} onClose={() => dispatch(sideBarActions.openMoreModal(false))} />}
                </div>
            </div>
        </nav>
    );
}
