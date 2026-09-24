import React from "react";
import { Profile } from "../../../models/Profile";

import Avatar from "../../../components/UI/Avatar/Avatar";
import Button from "../../../components/UI/Button/Button";
import { useAppSelector } from "../../../hooks/useStore";
import { createFollow, deleteFollow } from "../../../services/userService";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { socket } from "../../../socket/socket";

const TopInformation: React.FC<{ profile: Profile }> = ({ profile }) => {
    const privateHttp = usePrivateHttp();
    const currentUser = useAppSelector(
        (state) => state.authSlice.userInfo
    );

    const currentUserId = currentUser?._id;
    const isOwnProfile = profile._id === currentUserId;
    const [followers, setFollowers] = React.useState<number>(
        profile.followers ? profile.followers.length : 0
    );
    console.log("TopInformation", profile);
    const [isFollowing, setIsFollowing] = React.useState<boolean>(
        !!(
            currentUserId &&
            profile.followers?.some((follower) => {
                return follower._id === currentUserId;
            })
        )
    );
    React.useEffect(() => {
        setFollowers(profile.followers?.length || 0);

        const currentUserIsFollowing = !!(
            currentUserId &&
            profile.followers?.some(
                (follower) => follower._id === currentUserId
            )
        );

        setIsFollowing(currentUserIsFollowing);
    }, [profile, currentUserId]);
    const handleFollowUser = async () => {
        try {
            if (!isFollowing && profile._id) {
                const response = await createFollow(privateHttp, profile._id);
                setIsFollowing(true);
                setFollowers((prev) => prev + 1);
                socket.emit("sendNotification", {
                    senderId: currentUserId,
                    receiverId: profile._id,
                    type: "FOLLOW",
                    content: `${currentUser?.fullName || currentUser?.username} started following you`,
                });
                console.log(response);
            } else if (profile._id) {
                const response = await deleteFollow(privateHttp, profile._id);
                setIsFollowing(false);
                setFollowers((prev) => Math.max(0, prev - 1));
                console.log(response);
            }
        } catch (error) {
            console.log(error);
        }
    };
    return (
        <div className="grid grid-cols-3 text-white px-4 py-6">
            {/* <LeftAvatar avatarUrl={profile.avatar} />
            <RightContent profile={profile} /> */}

            {/* Profile Picture */}
            <div className="relative">
                <Avatar
                    avatarUrl={profile.avatar}
                    className="w-[150px] h-[150px]"
                />
            </div>

            {/* Profile Stats and Info */}
            <div className="flex-1 col-span-2">
                <div className="flex gap-2 mb-6">
                    {isOwnProfile ? (
                        <>
                            <Button
                                content="Edit profile"
                                className="px-4 py-1.5 text-sm bg-textGray hover:bg-gray-600 rounded"
                            />

                            <Button
                                content="View activity"
                                className="px-4 py-1.5 text-sm bg-textGray hover:bg-gray-600 rounded "
                            />

                            <Button
                                content="..."
                                className="w-8 h-8 bg-textGray hover:bg-gray-600 rounded"
                            />
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={handleFollowUser}
                                content={isFollowing ? "Following" : "Follow"}
                                className="flex items-center gap-1 px-4 py-1.5 text-sm bg-textGray hover:bg-gray-600 rounded"
                            />

                            {isFollowing && (
                                <Button
                                    onClick={handleFollowUser}
                                    content="Unfollow"
                                    className="px-4 py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded"
                                />
                            )}
                            <Button
                                content="Message"
                                className="px-4 py-1.5 text-sm bg-textGray hover:bg-gray-600 rounded"
                            />
                        </>
                    )}
                </div>
                {/* Stats */}
                <div className="flex gap-8 mb-4">
                    <div className="text-center">
                        <div className="text-xl font-semibold">
                            {profile.posts.length}
                        </div>
                        <div className="text-sm">posts</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-semibold">{followers}</div>
                        <div className="text-sm">followers</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-semibold">
                            {profile.followings?.length}
                        </div>
                        <div className="text-sm">following</div>
                    </div>
                </div>

                {/* Bio */}
                <div className="space-y-1">
                    <h2 className="font-semibold">{profile.fullName}</h2>
                    {profile.bio && <p className="text-sm">{profile.bio}</p>}
                    {profile.email && (
                        <p className="text-sm">{profile.email}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopInformation;
