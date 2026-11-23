import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCompass, faHouse, faMagnifyingGlass, faMessage, faPlus, faClapperboard, faUser, faChevronDown, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/useStore";
import { sideBarActions } from "../lib/redux/sideBarSlice";
import { authActions } from "../lib/redux/authSlice";
import { logout } from "../services/logoutService";
import usePrivateHttp from "../hooks/usePrivateHttp";
import Avatar from "./UI/Avatar/Avatar";

const AppChrome = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const http = usePrivateHttp();
    const user = useAppSelector((state) => state.authSlice.userInfo);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const isCurrent = (route: string) => route === "/" ? location.pathname === "/" : location.pathname.startsWith(route);
    const go = (route: string) => {
        const currentPage = route === "/" ? "home" : route.startsWith("/profile/") ? "profile" : route === "/message" ? "message" : route === "/reels" ? "reels" : "explore";
        dispatch(sideBarActions.selectCurrentPage(currentPage));
        navigate(route);
    };
    const openModal = (name: "search" | "notifications") => dispatch(sideBarActions.openModal(name));
    const logoutUser = async () => {
        const result = await logout(http);
        if (!result.success) return;
        dispatch(authActions.loggedOut());
        navigate("/login");
    };

    const destinations = [
        { label: "Home", route: "/", icon: faHouse },
        { label: "Discover", route: "/explore", icon: faCompass },
        { label: "Reels", route: "/reels", icon: faClapperboard },
        { label: "Messages", route: "/message", icon: faMessage },
        { label: "Profile", route: user?._id ? `/profile/${user._id}` : "/login", icon: faUser },
    ];

    return <>
        <header className="orbit-topbar">
            <button type="button" className="orbit-brand" onClick={() => go("/")} aria-label="Nối home">
                <span className="orbit-brand-mark">n</span><span>Nối</span>
            </button>
            <button type="button" className="orbit-search" onClick={() => openModal("search")}>
                <FontAwesomeIcon icon={faMagnifyingGlass} /><span>Search people, topics, or posts...</span>
            </button>
            <div className="orbit-account-wrap">
                <button type="button" className="orbit-account" onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen}>
                    <Avatar avatarUrl={user?.avatar} username={user?.username} className="h-9 w-9 rounded-full" />
                    <span>{user?.username || user?.fullName || "Account"}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                </button>
                {accountMenuOpen && <div className="orbit-account-menu">
                    <button type="button" onClick={() => go(user?._id ? `/profile/${user._id}` : "/login")}>View profile</button>
                    <button type="button" onClick={() => void logoutUser()}><FontAwesomeIcon icon={faRightFromBracket} /> Log out</button>
                </div>}
            </div>
        </header>
        <nav className={`orbit-bottom-nav ${location.pathname.startsWith("/message") ? "orbit-bottom-nav-messages" : ""}`} aria-label="Main navigation">
            {destinations.slice(0, 3).map(item => <button key={item.route} type="button" className={isCurrent(item.route) ? "is-active" : ""} onClick={() => go(item.route)}>
                <FontAwesomeIcon icon={item.icon} /><span>{item.label}</span>
            </button>)}
            <button type="button" className="orbit-create-nav" aria-label="Create post" onClick={() => dispatch(sideBarActions.openCreatePost(true))}><FontAwesomeIcon icon={faPlus} /></button>
            {destinations.slice(3, 4).map(item => <button key={item.route} type="button" className={isCurrent(item.route) ? "is-active" : ""} onClick={() => go(item.route)}>
                <FontAwesomeIcon icon={item.icon} /><span>{item.label}</span>
            </button>)}
            <button type="button" className="orbit-nav-utility" onClick={() => openModal("notifications")}><FontAwesomeIcon icon={faBell} /><span>Notifications</span></button>
            {destinations.slice(4).map(item => <button key={item.route} type="button" className={isCurrent("/profile") ? "is-active" : ""} onClick={() => go(item.route)}>
                <FontAwesomeIcon icon={item.icon} /><span>{item.label}</span>
            </button>)}
        </nav>
    </>;
};

export default AppChrome;
