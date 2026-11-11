import CurrentAccount from "./CurrentAccount";
import Suggested from "./Suggested";
import Information from "./Information";
const RightSide = () => {
    return (<div className="hidden xl:flex mt-[42px] w-[280px] shrink-0 flex-col text-sm">
            <CurrentAccount />
            <Suggested />
            <Information />
        </div>);
};
export default RightSide;
