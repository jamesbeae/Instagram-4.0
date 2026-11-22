import Card from "../../../components/UI/Card";
import CurrentAccount from "./CurrentAccount";
import Suggested from "./Suggested";
import Information from "./Information";
import TopicsCard from "./TopicsCard";
const RightSide = () => {
<<<<<<< Updated upstream
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
