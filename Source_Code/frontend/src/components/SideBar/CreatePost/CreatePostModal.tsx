import { useCallback, useEffect, useState } from "react";
import Heading from "./Heading";
import PhotoVideoInput from "./PhotoVideoInput";
import PhotoVideoPreview from "./PhotoVideoPreview";
import readFileAsDataURL from "../../../utils/readImageFile";
import StatusInput from "./StatusInput";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { createPost, validateCreatePostData, } from "../../../services/postService";
import { useAppDispatch } from "../../../hooks/useStore";
import { postsListActions } from "../../../lib/redux/postsListSlice";
import { sideBarActions } from "../../../lib/redux/sideBarSlice";
import { PhotoVideo } from "../../../models/PhotoVideo";
export type VideoPhotoPreview = {
    url: string;
    type: "VIDEO" | "PHOTO";
    name: string;
};
const CreatePostModal = () => {
    const privateHttp = usePrivateHttp();
    const [filesList, setFilesList] = useState<File[]>([]);
    const [photoVideoList, setphotoVideoList] = useState<PhotoVideo[]>([]);
    const [caption, setCaption] = useState<string>("");
    const dispatch = useAppDispatch();
    const [kind, setKind] = useState<"POST" | "STORY">("POST");
    const [visibility, setVisibility] = useState<"public" | "followers" | "group">("public");
    const [groups, setGroups] = useState<{
        id: string;
        name: string;
    }[]>([]);
    const [groupId, setGroupId] = useState("");
    useEffect(() => { privateHttp.get("/groups").then(r => setGroups(r.data.groups)).catch(() => { }); }, [privateHttp]);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState("");
    const getFilesListHandler = useCallback((files: FileList) => {
        setFilesList((pre) => {
            if (Array.from(files).some(f => f.size > 20 * 1024 * 1024)) {
                setError("Each file must be at most 20 MB");
                return pre;
            }
            if (pre.length + files.length > 10) {
                setError("Choose up to 10 files");
                return pre;
            }
            return [...pre, ...Array.from(files)];
        });
    }, []);
    useEffect(() => {
        let active = true;
        setphotoVideoList([]);
        Promise.all(filesList.map(async (file) => ({ url: String(await readFileAsDataURL(file)), type: file.type.startsWith('image/') ? 'PHOTO' as const : 'VIDEO' as const })))
            .then(items => { if (active)
            setphotoVideoList(items); }).catch(() => { if (active)
            setError('Unable to read selected files'); });
        return () => { active = false; };
    }, [filesList]);
    const deleteVideoPhotoHandler = useCallback((index: number) => {
        setFilesList((pre) => {
            const newState = [...pre];
            newState.splice(index, 1);
            return newState;
        });
    }, []);
    const getCaptionHandler = useCallback((value: string) => {
        setCaption(value);
    }, []);
    // click to post
    const shareHandler = useCallback(async () => {
        if (sharing)
            return;
        const validation = validateCreatePostData({ photoVideoList, caption, kind, visibility, ...(visibility === "group" ? { groupId } : {}) });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
        }
        setSharing(true);
        setError('');
        try {
            const result = await createPost(privateHttp, validation.data);
            if (kind === "POST")
                dispatch(postsListActions.addPost(result.data.post));
            else
                window.dispatchEvent(new Event("stories-updated"));
            dispatch(sideBarActions.openCreatePost(false));
        }
        catch (e: any) {
            setError(e.response?.data?.message || 'Unable to share post. Please try again.');
        }
        finally {
            setSharing(false);
        }
    }, [photoVideoList, caption, sharing, privateHttp, dispatch, kind, visibility, groupId]);
    return (<div className="w-[min(828px,95vw)] h-3/4 flex flex-col relative z-20 bg-lightDark rounded-lg">
            <Heading shareHandler={shareHandler}/>
            <div className="flex flex-wrap gap-3 px-4 py-2 text-white text-sm"><label>Type <select className="bg-dark" value={kind} onChange={e => setKind(e.target.value as "POST" | "STORY")}><option value="POST">Post / Reel</option><option value="STORY">Story · 24 hours</option></select></label><label>Audience <select className="bg-dark" value={visibility} onChange={e => setVisibility(e.target.value as "public" | "followers" | "group")}><option value="public">Public</option><option value="followers">Followers</option><option value="group">Relation list</option></select></label>{visibility === 'group' && <select aria-label="Relation list" className="bg-dark" value={groupId} onChange={e => setGroupId(e.target.value)}><option value="">Choose a list</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}</div>
            {sharing && <p role="status" className="text-white px-4">Uploading…</p>}
            {error && <p role="alert" className="text-red-400 px-4">{error}</p>}
            <div className="min-h-0 flex-1 w-full flex flex-col sm:flex-row overflow-y-auto">
                {filesList.length === 0 ? (<PhotoVideoInput getFilesListsHandler={getFilesListHandler}/>) : (<PhotoVideoPreview photoVideoList={photoVideoList} getFilesListsHandler={getFilesListHandler} deleteVideoPhotoHandler={deleteVideoPhotoHandler}/>)}

                <StatusInput getCaptionHandler={getCaptionHandler}/>
            </div>
        </div>);
};
export default CreatePostModal;
