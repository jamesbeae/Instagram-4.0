import { useState } from "react";
import LoginPromptModal from "../../components/LoginPromptModal";
import PostsList from "./PostsList";
import RightSide from "./RightSide";
import StoryList from "./StoryList";
import { useAppDispatch, useAppSelector } from "../../hooks/useStore";
import { sideBarActions } from "../../lib/redux/sideBarSlice";
import Avatar from "../../components/UI/Avatar/Avatar";
const Home = () => {
    const user = useAppSelector(state => state.authSlice.userInfo);
    const dispatch = useAppDispatch();
    const [loginPrompt, setLoginPrompt] = useState(false);
    const openCreate = () => {
        if (user) dispatch(sideBarActions.openCreatePost(true));
        else setLoginPrompt(true);
    };
    return (<div className="home-layout flex-1 min-w-0 flex justify-center overflow-auto scrollbar-hide px-3">
            <div className="flex flex-col items-center w-full min-w-0 max-w-[630px]">
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
            {loginPrompt && <LoginPromptModal onClose={() => setLoginPrompt(false)} />}
        </div>);
};
export default Home;
