import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Profile as ProfileType } from "../../models/Profile";
import { getUserProfile } from "../../services/userService";
import usePrivateHttp from "../../hooks/usePrivateHttp";
import TopInformation from "./TopInformation";
import PostList from "./PostList";

const Profile = () => {
    const { _id } = useParams<{ _id: string }>();
    const privateHttp = usePrivateHttp();

    const [profile, setProfile] = useState<ProfileType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const getProfile = async () => {
            if (!_id) {
                setErrorMessage("Không tìm thấy ID người dùng");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setErrorMessage("");

            try {
                const response = await getUserProfile(
                    privateHttp,
                    _id
                );

                setProfile(response.data.profile);
            } catch (error) {
                console.error(error);
                setErrorMessage("Không thể tải hồ sơ người dùng");
                setProfile(null);
            } finally {
                setIsLoading(false);
            }
        };

        getProfile();
    }, [_id, privateHttp]);

    if (isLoading) {
        return (
            <div className="text-white text-center mt-10">
                Đang tải hồ sơ...
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="text-red-500 text-center mt-10">
                {errorMessage}
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-white text-center mt-10">
                Không tìm thấy người dùng
            </div>
        );
    }

    return (
        <div className="max-w-[935px] w-[calc(100%-40px)] mx-auto py-[30px] px-5 overflow-y-auto scrollbar-hide">
            <TopInformation profile={profile} />

            <PostList
                posts={profile.posts || []}
                saved={profile.saved || []}
            />
        </div>
    );
};

export default Profile;