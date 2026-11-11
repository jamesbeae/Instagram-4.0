import PostsList from "./PostsList";
import RightSide from "./RightSide";
import StoryList from "./StoryList";
const Home = () => {
    return (<div className="flex-1 min-w-0 flex justify-center overflow-auto scrollbar-hide px-3">
            <div className="flex flex-col items-center w-full max-w-[630px] xl:mr-8">
                {/* Story List */}
                <StoryList />
                {/* Posts */}
                <PostsList />
            </div>
            {/* Right Side */}
            <RightSide />
        </div>);
};
export default Home;
