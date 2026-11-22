import Card from "../../../components/UI/Card";
import CurrentAccount from "./CurrentAccount";
import Suggested from "./Suggested";
import Information from "./Information";
<<<<<<< HEAD
import TopicsCard from "./TopicsCard";
const RightSide = () => {
<<<<<<< Updated upstream
=======
import { useAppSelector } from "../../../hooks/useStore";
import { Link } from "react-router-dom";
const RightSide = () => {
    const user = useAppSelector(state => state.authSlice.userInfo);
    if (!user) return <Card as="aside" aria-label="Join Nối" className="home-account-panel guest-signup-card text-sm">
        <div className="px-5"><span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue text-white font-bold">N</span><h2 className="text-lg font-semibold">A little more with an account</h2><p className="mt-2 text-textSecondGray">Follow people, join conversations, and keep the posts you love.</p><Link to="/login" className="mt-5 block rounded-lg bg-blue px-4 py-2 text-center font-semibold text-white">Log in</Link><Link to="/sign-up" className="mt-2 block rounded-lg border border-lightDark px-4 py-2 text-center">Create account</Link></div>
    </Card>;
>>>>>>> origin/feature/reels-messages-notifications-ui-fixed
    return (<Card as="aside" aria-label="Account and follow suggestions" className="home-account-panel text-sm">
=======
    return (<div className="home-suggestions hidden desktop:flex mt-[42px] w-[300px] shrink-0 flex-col text-sm">
>>>>>>> Stashed changes
            <CurrentAccount />
            <Suggested />
            <TopicsCard />
            <Information />
        </Card>);
};
export default RightSide;
