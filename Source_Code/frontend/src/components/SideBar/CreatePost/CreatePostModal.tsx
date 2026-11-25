import { useEffect, useId, useRef, useState } from "react";
import Button from "../../UI/Button/Button";
import Card from "../../UI/Card";
import Loading from "../../UI/Loading";
import SelectField from "../../UI/SelectField";
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

const typeOptions = [
    { value: "POST", label: "Post", description: "Share one or more photos or videos to your feed." },
    { value: "STORY", label: "Story", description: "Share photos or videos that disappear after 24 hours." },
    { value: "REEL", label: "Reel", description: "Publish one video as a Reel." },
] as const;
const reelMediaTypes = "video/mp4,video/webm";

const audienceOptions = [
    { value: "public", label: "Public" },
    { value: "followers", label: "Followers" },
    { value: "group", label: "Relation list" },
] as const;

export default function CreatePostModal({ onClose }: { onClose: () => void }) {
    const privateHttp = usePrivateHttp();
    const dispatch = useAppDispatch();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const nextMediaId = useRef(0);
    const titleId = useId();
    const [step, setStep] = useState<"type" | "media" | "details">("type");
    const [media, setMedia] = useState<PhotoVideo[]>([]);
    const [caption, setCaption] = useState("");
    const [kind, setKind] = useState<typeof typeOptions[number]["value"]>("POST");
    const [visibility, setVisibility] = useState<typeof audienceOptions[number]["value"]>("public");
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
    const canShare = isDetails && canContinue && (kind !== "REEL" || (media.length === 1 && media[0].type === "VIDEO")) &&
        (visibility !== "group" || groupId !== "");
    const selectedType = typeOptions.find(option => option.value === kind)!;

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
        const exceedsMediaLimit = kind === "REEL" ? selected.length !== 1 : media.length + selected.length > 10;
        if (exceedsMediaLimit) {
            setError(kind === "REEL" ? "A Reel can contain one video only" : "Choose up to 10 files");
            return;
        }
        const supportedTypes = acceptedMediaTypes.split(",");
        if (selected.some(file => !supportedTypes.includes(file.type))) {
            setError("Choose a JPEG, PNG, WebP, GIF, MP4 or WebM file");
            return;
        }
        if (kind === "REEL" && selected.some(file => !file.type.startsWith("video/"))) {
            setError("A Reel requires one video");
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
            setMedia(current => kind === "REEL" ? previews : [...current, ...previews]);
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

    function chooseType(nextKind: typeof kind) {
        setKind(nextKind);
        setError("");
        setStep("media");
    }

    function selectType(nextKind: typeof kind) {
        if (nextKind !== kind) {
            setMedia([]);
            setCaption("");
            setVisibility("public");
            setGroupId("");
            nextMediaId.current = 0;
        }
        setKind(nextKind);
        setError("");
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
            ...(caption.trim() ? { caption: caption.trim() } : {}),
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
            } else if (kind === "REEL") {
                window.dispatchEvent(new CustomEvent("reels-updated", { detail: result.data.post }));
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
                    title={step === "type" ? "Create" : step === "media" ? `Create ${selectedType.label}` : `New ${selectedType.label}`}
                    onBack={step === "media" ? () => changeStep("type") : isDetails ? () => changeStep("media") : undefined} />

                <div ref={bodyRef} className="create-post-body">
                    {step === "type" && <section className="create-post-type-picker" aria-label="Choose what to create">
                        {typeOptions.map(option => <button key={option.value} type="button"
                            className={`create-post-type-option${kind === option.value ? " is-selected" : ""}`}
                            aria-pressed={kind === option.value} onClick={() => selectType(option.value)}>
                            <span className="create-post-type-title">{option.label}</span>
                            <span className="create-post-type-description">{option.description}</span>
                        </button>)}
                    </section>}
                    {step !== "type" && (media.length > 0
                        ? <PhotoVideoPreview media={media} onAdd={addMedia} onRemove={removeMedia} busy={mediaBusy}
                            accept={kind === "REEL" ? reelMediaTypes : acceptedMediaTypes} multiple={kind !== "REEL"}
                            addLabel={kind === "REEL" ? "Replace video" : "Add more"} />
                        : step === "media" ? <PhotoVideoInput onFiles={addMedia} busy={mediaBusy}
                            accept={kind === "REEL" ? reelMediaTypes : acceptedMediaTypes} multiple={kind !== "REEL"}
                            title={kind === "REEL" ? "Choose one video for your Reel" : "Add photos or videos"}
                            hint={kind === "REEL" ? "One MP4 or WebM video, up to 20 MB." : `Up to 10 items. ${kind === "STORY" ? "Your Story disappears after 24 hours." : ""}`} /> : null)}
                    <div className="create-post-details" hidden={!isDetails}>
                        <div>
                            <StatusInput key={kind} onCaptionChange={setCaption} />
                            <p className="create-post-optional">Caption · optional</p>
                        </div>
                        <div className="create-post-kind-summary">
                            <strong>{selectedType.label}</strong>
                            <span>{selectedType.description}</span>
                        </div>
                        <div className="create-post-options">
                            <SelectField label="Audience" name="visibility" value={visibility} options={audienceOptions}
                                onChange={setVisibility} disabled={sharing} />
                            {visibility === "group" && (
                                <SelectField label="Relation list" name="groupId" className="col-span-full"
                                    value={groupId} disabled={sharing} onChange={setGroupId}
                                    options={[
                                        { value: "", label: "Choose a list" },
                                        ...groups.map(group => ({ value: group.id, label: group.name })),
                                    ]} />
                            )}
                            {kind === "REEL" && (media.length !== 1 || media[0]?.type !== "VIDEO") && <p role="alert" className="col-span-full text-sm text-red-400">A Reel requires exactly one video. Remove other files or choose a video.</p>}
                        </div>
                    </div>
                </div>

                <footer className="create-post-footer">
                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                    {preparing && <Loading message="Preparing preview…" />}
                    {sharing && <Loading message="Uploading…" />}
                    {isDetails
                        ? <Button className="create-post-share" disabled={!canShare} onClick={share}>{kind === "POST" ? "Share post" : kind === "STORY" ? "Share to story" : "Publish reel"}</Button>
                        : step === "media"
                            ? <Button className="create-post-share" disabled={!canContinue || (kind === "REEL" && (media.length !== 1 || media[0]?.type !== "VIDEO"))} onClick={() => changeStep("details")}>Next</Button>
                            : <Button className="create-post-share" onClick={() => chooseType(kind)}>Continue</Button>}
                </footer>
            </Card>
        </dialog>
    );
}
