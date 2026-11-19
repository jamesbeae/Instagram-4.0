import Avatar from "../../../components/UI/Avatar/Avatar";
import useRedirect from "../../../hooks/useRedirect";

const UserTagBar: React.FC<{
    _id?: string;
    username?: string;
    fullName?: string;
    avatar?: string | null;
    annotate?: string;
    className?: string;
    avatarClassName?: string;
    annotateClassName?: string;
    ActionButton?: React.FC<{ userId?: string }>;
}> = ({
    _id,
    username,
    fullName,
    avatar,
    annotate,
    className,
    avatarClassName,
    annotateClassName,
    ActionButton,
}) => {
    const gotoProfilePage = useRedirect().gotoProfilePage;
    return (
        <div className={`flex items-center ${className}`}>
            <Avatar
                className={`${
                    avatarClassName ? avatarClassName : "h-[44px] w-[44px]"
                } mr-3`}
                username={username}
                avatarUrl={avatar}
            />
            <div className="flex-1">
                <div
                    className="text-foreground font-semibold cursor-pointer text-sm"
                    onClick={() => {
                        gotoProfilePage(_id);
                    }}
                >
                    {username || fullName}
                </div>
                <div className={`text-textSecondGray ${annotateClassName}`}>
                    {annotate}
                </div>
            </div>
            {ActionButton && <ActionButton userId={_id} />}
        </div>
    );
};

export default UserTagBar;
