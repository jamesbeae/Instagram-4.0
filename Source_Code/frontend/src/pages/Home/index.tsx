import PostsList from "./PostsList";
import RightSide from "./RightSide";
import StoryList from "./StoryList";
const Home = () => {
    return (<div className="home-layout flex-1 min-w-0 overflow-auto scrollbar-hide">
            <main className="home-feed-column">
                <StoryList />
                <PostsList />
            </main>
            <RightSide />
        </div>);
};
export default Home;
