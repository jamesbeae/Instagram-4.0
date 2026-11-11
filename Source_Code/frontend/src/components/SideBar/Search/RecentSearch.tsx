const RecentSearch = () => {
    return (<div className="h-full pt-3 flex flex-col border-t-0.5 border-lightDark text-white">
            <p className="mx-6 my-2 pt-1 font-bold ">Recent</p>
            <div className="flex-1 flex justify-center text-center">
                <p className="m-auto text-sm text-textGray font-semibold">
                    No recent searches <br />
                    <span>(This feature will be updated soon)</span>
                </p>
            </div>
        </div>);
};
export default RecentSearch;
