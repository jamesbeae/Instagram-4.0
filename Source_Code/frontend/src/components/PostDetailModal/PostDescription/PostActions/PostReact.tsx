import { Post } from '../../../../models/Post';
import PostActions from '../../../PostActions';
import calculateTimeAgo from '../../../../utils/calculateTimeAgo';
export default function PostReact({ postData }: {
    postData: Post;
}) { return <div className="border-l border-lightDark border-b px-4"><PostActions post={postData} onComment={() => document.getElementById('comment')?.focus()}/><p className="text-xs text-textGray pb-3">{calculateTimeAgo(postData.createdAt, true)} ago</p></div>; }
