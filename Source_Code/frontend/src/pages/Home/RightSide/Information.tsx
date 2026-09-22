import React from "react";

const Information = () => {
    const InformationList = [
        {
            name: "Help",
            url: "#!",
        },
        {
            name: "Press",
            url: "#!",
        },
        {
            name: "API",
            url: "#!",
        },
        {
            name: "Jobs",
            url: "#!",
        },
        {
            name: "Privacy",
            url: "#!",
        },
        {
            name: "Terms",
            url: "#!",
        },
        {
            name: "Locations",
            url: "#!",
        },
        {
            name: "Language",
            url: "#!",
        },
        {
            name: "Meta Verified",
            url: "#!",
        },
    ];
    return (
        <div className="text-xs text-textSecondGray">
            <div className="mb-4 flex flex-wrap gap-x-1 gap-y-[2px]">
                {InformationList.map((item, index) => {
                    return (
                        <a
                            key={item.name}
                            href={item.url}
                            className={`flex items-stretch gap-x-1 ${
                                index !== InformationList.length - 1 &&
                                "after:content-['·']"
                            } 
                            after:text-textSecondGray after:flex after:items-center`}
                        >
                            <span className="hover:underline">{item.name}</span>
                        </a>
                    );
                })}
            </div>

            <div className="copy-right">© 2026 INSTAGRAM FROM Huydayne1608</div>
        </div>
    );
};

export default Information;
