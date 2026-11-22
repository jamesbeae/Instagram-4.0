import PostsList from "./PostsList";
import RightSide from "./RightSide";
import StoryList from "./StoryList";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import { sideBarActions } from "../../lib/redux/sideBarSlice";
import Avatar from "../../components/UI/Avatar/Avatar";
const Home = () => {
<<<<<<< Updated upstream
    return (<div className="home-layout flex-1 min-w-0 flex justify-center overflow-auto scrollbar-hide px-3">
            <div className="flex flex-col items-center w-full min-w-0 max-w-[630px]">
=======
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.authSlice.userInfo);
    const openCreate = () => dispatch(sideBarActions.openCreatePost(true));
    return (<div className="home-workspace flex-1 min-w-0 flex justify-center overflow-auto scrollbar-hide px-3">
            <div className="home-feed-column flex flex-col items-center w-full max-w-[700px] desktop:mr-8">
>>>>>>> Stashed changes
                {/* Story List */}
                <StoryList />
                <section className="home-composer" aria-label="Create a post">
                    <div className="home-composer-prompt">
                        <Avatar avatarUrl={user?.avatar} username={user?.username} className="w-11 h-11 rounded-full" />
                        <button type="button" onClick={openCreate}>What would you like to share?</button>
                    </div>
                    <div className="home-composer-actions">
                        <button type="button" onClick={openCreate}>Add photo or video</button>
                        <button type="button" onClick={openCreate}>Share a moment</button>
                        <button type="button" onClick={openCreate}>Create post</button>
                    </div>
                </section>
                {/* Posts */}
                <PostsList />
            </div>
            {/* Right Side */}
            <RightSide />
        </div>);
};
export default Home;
