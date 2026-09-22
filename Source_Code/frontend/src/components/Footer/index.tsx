import React from "react";

const Footer = () => {
    return (
        <div className="flex flex-col gap-6 items-center justify-center text-xs text-textGray">
            <ul className="px-2 flex flex-wrap justify-center gap-6 transition">
                <li className="cursor-pointer hover:underline">Meta</li>
                <li className="cursor-pointer hover:underline">About</li>
                <li className="cursor-pointer hover:underline">Blog</li>
                <li className="cursor-pointer">Jobs</li>
                <li className="cursor-pointer hover:underline">Help</li>
                <li className="cursor-pointer hover:underline">API</li>
                <li className="cursor-pointer">Privacy</li>
                <li className="cursor-pointer">Terms</li>
                <li className="cursor-pointer">Location</li>
                <li className="cursor-pointer">Instagram Lite</li>
                <li className="cursor-pointer hover:underline">Threads</li>
                <li className="cursor-pointer">
                    Contact Uploading & Non-Users
                </li>
                <li className="cursor-pointer hover:underline">
                    Meta Verified
                </li>
            </ul>

            <ul className="flex gap-6 flex-wrap justify-center">
                <li>English</li>
                <li>© 2026 INSTAGRAM FROM huydayne1608</li>
            </ul>
        </div>
    );
};

export default Footer;
