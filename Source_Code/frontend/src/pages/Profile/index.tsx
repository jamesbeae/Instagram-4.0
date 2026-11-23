import Loading from "../../components/UI/Loading";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks/useStore";
import type { Profile as ProfileType } from "../../models/Profile";
import { getUserProfile } from "../../services/userService";
import usePrivateHttp from "../../hooks/usePrivateHttp";
import TopInformation from "./TopInformation";
import PostList from "./PostList";
import "./Profile.css";
const Profile = () => {
    const { _id } = useParams<{
        _id: string;
    }>();
    const privateHttp = usePrivateHttp();
    const currentUserId = useAppSelector(state => state.authSlice.userInfo?._id);
    const [profile, setProfile] = useState<ProfileType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    useEffect(() => {
        let active = true;
        const getProfile = async () => {
            if (!_id) {
                setErrorMessage("Không tìm thấy ID người dùng");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setErrorMessage("");
            try {
                const response = await getUserProfile(privateHttp, _id);
                if (active) setProfile(response.data.profile);
            }
            catch (error) {
                if (!active) return;
                console.error(error);
                setErrorMessage("Không thể tải hồ sơ người dùng");
                setProfile(null);
            }
            finally {
                if (active) setIsLoading(false);
            }
        };
        void getProfile();
        return () => { active = false; };
    }, [_id, privateHttp]);
    useEffect(() => {
        const remove = (e: Event) => setProfile(p => p ? { ...p, posts: p.posts.filter(post => post._id !== (e as CustomEvent<string>).detail), saved: (p.saved || []).filter(post => post._id !== (e as CustomEvent<string>).detail) } : p);
        const update = (e: Event) => setProfile(p => p ? { ...p, posts: p.posts.map(post => post._id === (e as CustomEvent).detail._id ? (e as CustomEvent).detail : post), saved: (p.saved || []).map(post => post._id === (e as CustomEvent).detail._id ? (e as CustomEvent).detail : post) } : p);
        window.addEventListener('post-deleted', remove);
        window.addEventListener('post-updated', update);
        return () => { window.removeEventListener('post-deleted', remove); window.removeEventListener('post-updated', update); };
    }, []);
    if (isLoading || (profile && profile._id !== _id && !errorMessage)) {
        return <Loading message="Đang tải hồ sơ..." className="self-start flex-1 mt-10 text-foreground" />;
    }
    if (errorMessage) {
        return (<div className="text-red-500 text-center mt-10">
                {errorMessage}
            </div>);
    }
    if (!profile) {
        return (<div className="text-foreground text-center mt-10">
                Không tìm thấy người dùng
            </div>);
    }
    const canViewSaved = profile._id === currentUserId;
    return (
        <main className="profile-page" aria-labelledby="profile-name">
            <div className="profile-content" key={profile._id}>
                <TopInformation profile={profile}
                    onProfileUpdated={user => setProfile(current => current?._id === profile._id ? { ...current, ...user } : current)} />
                <PostList posts={profile.posts || []} saved={profile.saved || []} canViewSaved={canViewSaved} />
            </div>
        </main>
    );
};
export default Profile;
