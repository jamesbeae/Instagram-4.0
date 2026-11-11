import { FC, useEffect, useRef } from "react";
import { Message } from "../../../../models/Message";
import { useAppSelector } from "../../../../hooks/useStore";
import { User } from "../../../../models/User";
import MessageBubble from "./MessageBubble";
const ChatBoxList: FC<{
    messages: Message[];
    sendingUser: User;
}> = ({ messages, sendingUser, }) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [messages]);
    const currentUser = useAppSelector((state) => state.authSlice.userInfo);
    console.log("ChatBoxList messages:", messages);
    return (<div ref={chatContainerRef} className="flex-1 p-4 overflow-y-scroll">
            <div className="space-y-1">
                {messages.map((message, index) => {
            console.log("Message:", message);
            const showAvatar = message.sender_id === currentUser?._id &&
                (index === 0 ||
                    messages[index - 1].receiver_id !==
                        message.sender_id);
            return (<MessageBubble isOwn={message.sender_id === currentUser?._id} key={message._id} message={message} userAvatar={sendingUser?.avatar} showAvatar={showAvatar}/>);
        })}
            </div>
        </div>);
};
export default ChatBoxList;
