import { Link } from "react-router-dom";
import type { User } from "../../../models/User";
import Avatar from "../../UI/Avatar/Avatar";
import { useAppDispatch } from "../../../hooks/useStore";
import { sideBarActions } from "../../../lib/redux/sideBarSlice";

export default function SearchedResult({ user }: { user: User }) {
    const dispatch = useAppDispatch();
    const name = user.username || user.fullName || "Unknown account";

    return (
        <Link to={`/profile/${user._id}`} className="sidebar-post-result sidebar-account-result"
            onClick={event => {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                dispatch(sideBarActions.closePanel("search"));
            }}>
            <Avatar className="h-10 w-10 shrink-0" avatarUrl={user.avatar} username={name} />
            <span className="sidebar-post-result-info">
                <strong className="sidebar-account-result-name">{name}</strong>
                {user.fullName && user.fullName !== name && <span className="sidebar-account-result-fullname">{user.fullName}</span>}
            </span>
        </Link>
    );
}
