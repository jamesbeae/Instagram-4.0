import Loading from "../../../components/UI/Loading";
import React, { useCallback, useEffect, useState } from "react";
import { User } from "../../../models/User";
import { getSuggestedUsers as getSuggestedUsersList } from "../../../services/userService";
import UserTagBar from "../../../components/UI/UserTagBar";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { createFollow, deleteFollow } from "../../../services/userService";
const SuggestedUsersAction: React.FC<{
    userId?: string;
}> = ({ userId }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [error, setError] = useState("");
    const privateHttp = usePrivateHttp();
    const handleFollowUser = async () => {
        setError("");
        try {
            if (!isFollowing && userId) {
                const response = await createFollow(privateHttp, userId);
                setIsFollowing(true);
                console.log(response);
            }
            else if (userId) {
                const response = await deleteFollow(privateHttp, userId);
                setIsFollowing(false);
                console.log(response);
            }
        }
        catch {
            setError("This account is no longer available. Choose another suggestion.");
        }
    };
    return (<div className="text-blue text-xs cursor-pointer hover:opacity-50">
            <button type="button" onClick={() => {
            handleFollowUser();
        }}>
                {isFollowing ? "Unfollow" : "Follow"}
            </button>
            {error && <p role="alert" className="text-red-400">{error}</p>}
        </div>);
};
const Suggested = () => {
    const privateHttp = usePrivateHttp();
    const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const loadSuggestions = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await getSuggestedUsersList(privateHttp);
            setSuggestedUsers(result?.data.users || []);
        }
        catch {
            setSuggestedUsers([]);
            setError("Unable to load suggestions.");
        }
        finally {
            setLoading(false);
        }
    }, [privateHttp]);
    useEffect(() => {
        void loadSuggestions();
    }, [loadSuggestions]);
    return (<div className="mx-4 mt-6 mb-3">
            <div className="flex justify-between items-center">
                <div className="font-semibold text-textSecondGray">
                    Suggested for you
                </div>

                <div className="font-semibold text-white text-xs cursor-pointer hover:text-textGray select-none ">
                    See all
                </div>
            </div>

            <div className="flex flex-col py-2">
                {loading ? <Loading message="Loading suggestions…" className="text-textSecondGray" />
                    : error ? <div className="text-center"><p role="alert" className="text-red-400 text-sm">{error}</p><button type="button" onClick={() => void loadSuggestions()}>Try again</button></div>
                    : suggestedUsers && suggestedUsers.length > 0 ? (suggestedUsers.map((user) => {
            return (<UserTagBar key={`suggested-${user._id}`} _id={user._id} username={user.username} fullName={user.fullName} avatar={user.avatar} annotate="Suggested for you" ActionButton={SuggestedUsersAction} className="py-2" annotateClassName="text-xs"/>);
        })) : (<div className="text-textSecondGray text-sm text-center italic">
                        No suggested users
                    </div>)}
            </div>
        </div>);
};
export default Suggested;
