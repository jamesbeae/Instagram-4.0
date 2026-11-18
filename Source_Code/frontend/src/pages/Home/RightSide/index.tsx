import Card from "../../../components/UI/Card";
import CurrentAccount from "./CurrentAccount";
import Suggested from "./Suggested";
import Information from "./Information";
const RightSide = () => {
    return (<Card as="aside" aria-label="Account and follow suggestions" className="home-account-panel text-sm">
            <CurrentAccount />
            <Suggested />
            <Information />
        </Card>);
};
export default RightSide;
