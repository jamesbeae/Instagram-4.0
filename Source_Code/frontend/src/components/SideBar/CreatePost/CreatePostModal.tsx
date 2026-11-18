import { useEffect, useId, useRef, useState } from "react";
import Button from "../../UI/Button/Button";
import Card from "../../UI/Card";
import Loading from "../../UI/Loading";
import Heading from "./Heading";
import { useUnsavedChanges } from "../../UnsavedChanges";
import PhotoVideoInput, { acceptedMediaTypes } from "./PhotoVideoInput";
import PhotoVideoPreview from "./PhotoVideoPreview";
import StatusInput from "./StatusInput";
import readFileAsDataURL from "../../../utils/readImageFile";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import { createPost, validateCreatePostData } from "../../../services/postService";
import { useAppDispatch } from "../../../hooks/useStore";
import { postsListActions } from "../../../lib/redux/postsListSlice";
import { PhotoVideo } from "../../../models/PhotoVideo";
import "./CreatePostModal.css";

export default function CreatePostModal({ onClose }: { onClose: () => void }) {
    const privateHttp = usePrivateHttp();
    const dispatch = useAppDispatch();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const nextMediaId = useRef(0);
    const titleId = useId();
    const [step, setStep] = useState<"media" | "details">("media");
    const [media, setMedia] = useState<PhotoVideo[]>([]);
    const [caption, setCaption] = useState("");
    const [kind, setKind] = useState<"POST" | "STORY">("POST");
    const [visibility, setVisibility] = useState<"public" | "followers" | "group">("public");
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
    const [groupId, setGroupId] = useState("");
    const [preparing, setPreparing] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState("");
    const { requestExit, markSaved } = useUnsavedChanges(
        preparing || media.length > 0 || caption !== "" || kind !== "POST" || visibility !== "public" || groupId !== "",
        onClose,
    );
    const isDetails = step === "details";
    const mediaBusy = preparing || sharing;
    const canContinue = !mediaBusy && media.length > 0;
    const canShare = isDetails && canContinue && caption.trim().length > 0 &&
        (visibility !== "group" || groupId !== "");

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);

    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
        titleRef.current?.focus();
    }, [step]);

    useEffect(() => {
        let active = true;
        privateHttp.get("/groups")
            .then(response => {
                if (active) setGroups(response.data.groups);
            })
            .catch(() => {});
        return () => { active = false; };
    }, [privateHttp]);

    async function addMedia(files: FileList) {
        if (mediaBusy || files.length === 0) return;
        const selected = Array.from(files);
        if (selected.some(file => file.size > 20 * 1024 * 1024)) {
            setError("Each file must be at most 20 MB");
            return;
        }
        if (media.length + selected.length > 10) {
            setError("Choose up to 10 files");
            return;
        }
        const supportedTypes = acceptedMediaTypes.split(",");
        if (selected.some(file => !supportedTypes.includes(file.type))) {
            setError("Choose a JPEG, PNG, WebP, GIF, MP4 or WebM file");
            return;
        }

        setPreparing(true);
        setError("");
        try {
            const previews = await Promise.all(selected.map(async (file): Promise<PhotoVideo> => {
                const url = await readFileAsDataURL(file);
                if (typeof url !== "string") throw new Error("File preview is unavailable");
                return { _id: String(nextMediaId.current++), url, type: file.type.startsWith("image/") ? "PHOTO" : "VIDEO" };
            }));
            setMedia(current => [...current, ...previews]);
        } catch {
            setError("Unable to read selected files");
        } finally {
            setPreparing(false);
        }
    }

    function changeStep(nextStep: typeof step) {
        setError("");
        setStep(nextStep);
    }

    function removeMedia(index: number) {
        setMedia(current => current.filter((_, currentIndex) => currentIndex !== index));
        if (media.length === 1) changeStep("media");
        else setError("");
    }

    async function share() {
        if (!canShare) return;
        const validation = validateCreatePostData({
            photoVideoList: media,
            caption,
            kind,
            visibility,
            ...(visibility === "group" ? { groupId } : {}),
        });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
        }

        setSharing(true);
        setError("");
        try {
            const result = await createPost(privateHttp, validation.data);
            if (kind === "POST") {
                dispatch(postsListActions.addPost(result.data.post));
            } else {
                window.dispatchEvent(new Event("stories-updated"));
            }
            markSaved();
            onClose();
        } catch (error: any) {
            setError(error.response?.data?.message || "Unable to share post. Please try again.");
        } finally {
            setSharing(false);
        }
    }

    function dismiss() {
        if (!sharing) requestExit(onClose);
    }

    return (
        <dialog ref={dialogRef} className="create-post-dialog" aria-labelledby={titleId}
            onCancel={event => { event.preventDefault(); dismiss(); }}
            onClick={event => { if (event.target === event.currentTarget) dismiss(); }}>
            <Card className="create-post-card">
                <Heading id={titleId} titleRef={titleRef} onClose={dismiss} busy={sharing}
                    onBack={isDetails ? () => changeStep("media") : undefined} />

                <div ref={bodyRef} className="create-post-body">
                    {media.length > 0
                        ? <PhotoVideoPreview media={media} onAdd={addMedia} onRemove={removeMedia} busy={mediaBusy} />
                        : <PhotoVideoInput onFiles={addMedia} busy={mediaBusy} />}
                    <div className="create-post-details" hidden={!isDetails}>
                        <StatusInput onCaptionChange={setCaption} />
                        <div className="create-post-options">
                            <label>Type
                                <select value={kind} disabled={sharing} onChange={event => setKind(event.target.value as typeof kind)}>
                                    <option value="POST">Post / Reel</option><option value="STORY">Story · 24 hours</option>
                                </select>
                            </label>
                            <label>Audience
                                <select value={visibility} disabled={sharing} onChange={event => setVisibility(event.target.value as typeof visibility)}>
                                    <option value="public">Public</option><option value="followers">Followers</option><option value="group">Relation list</option>
                                </select>
                            </label>
                            {visibility === "group" && <label className="col-span-full">Relation list
                                <select value={groupId} disabled={sharing} onChange={event => setGroupId(event.target.value)}>
                                    <option value="">Choose a list</option>
                                    {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                </select>
                            </label>}
                        </div>
                    </div>
                </div>

                <footer className="create-post-footer">
                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                    {preparing && <Loading message="Preparing preview…" />}
                    {sharing && <Loading message="Uploading…" />}
                    {isDetails
                        ? <Button className="create-post-share" disabled={!canShare} onClick={share}>Share</Button>
                        : <Button className="create-post-share" disabled={!canContinue} onClick={() => changeStep("details")}>Next</Button>}
                </footer>
            </Card>
        </dialog>
    );
}
