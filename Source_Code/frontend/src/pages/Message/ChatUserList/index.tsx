import React from "react";
import { socket } from "../../../socket/socket";
import Avatar from "../../../components/UI/Avatar/Avatar";
import { User } from "../../../models/User";
import { useAppSelector } from "../../../hooks/useStore";
import { useParams } from "react-router-dom";
import useRedirect from "../../../hooks/useRedirect";
const ChatUserList: React.FC<{
    users: User[] | null;
}> = ({ users }) => {
    const [online, setOnline] = React.useState<string[]>([]);
    React.useEffect(() => { const update = (ids: string[]) => setOnline(ids); socket.on("onlineUsers", update); socket.emit("addUser"); return () => { socket.off("onlineUsers", update); }; }, []);
    const param = useParams();
    const { gotoMessagePage } = useRedirect();
    const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(param.user_id);
    const onUserSelect = (userId: string, user: User) => {
        gotoMessagePage(userId, user);
        setSelectedUserId(userId);
    };
    const currentUser = useAppSelector((state) => state.authSlice.userInfo);
    return (<div className="w-96 h-screen dark:bg-black border-r border-lightDark dark:border-gray-800 flex flex-col">
            <div className="p-4 border-b border-lightSecondDark">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">
                        {currentUser?.username || currentUser?.fullName}
                    </h2>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {users &&
            users.map((user) => (<div key={user._id} className={`p-3 hover:bg-lightSecondDark cursor-pointer transition-colors ${selectedUserId === user._id
                    ? "bg-lightSecondDark"
                    : ""}`} onClick={() => onUserSelect(user._id, user)}>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Avatar className="w-12 h-12" avatarUrl={user.avatar}/>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-medium text-sm truncate">
                                            {user.username || user.fullName} {online.includes(user._id) && <span className="text-green-400 text-xs">· Online</span>}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </div>))}
            </div>
        </div>);
};
export default ChatUserList;
