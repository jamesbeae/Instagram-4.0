import React from "react";
import { User } from "../../../models/User";
import UserTagBar from "../../UI/UserTagBar";

const SearchedResult: React.FC<{ results?: User[] }> = ({ results = [] }) => {
    const safeResults = Array.isArray(results) ? results : [];

    return (
        <div className="flex flex-col gap-2 px-4">
            {safeResults.map((user) => (
                <UserTagBar
                    key={user._id}
                    _id={user._id}
                    username={user.username || user.fullName || "Unknown user"}
                    avatar={user.avatar}
                />
            ))}
        </div>
    );
};

export default SearchedResult;
