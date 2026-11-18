import { useRef, useState } from "react";
import { faImage } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../UI/Button/Button";

export const acceptedMediaTypes = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

export default function PhotoVideoInput({ onFiles, busy }: {
    onFiles: (files: FileList) => void;
    busy: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    return (
        <div className={`create-post-dropzone${dragging ? " is-dragging" : ""}`}
            onDragOver={event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = busy ? "none" : "copy";
                if (!busy) setDragging(true);
            }}
            onDragLeave={event => {
                if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                    setDragging(false);
                }
            }}
            onDrop={event => {
                event.preventDefault();
                setDragging(false);
                if (!busy) onFiles(event.dataTransfer.files);
            }}>
            <FontAwesomeIcon icon={faImage} className="text-3xl text-textGray" aria-hidden="true" />
            <p>Drag photos and videos here</p>
            <Button className="create-post-select-files" disabled={busy} onClick={() => inputRef.current?.click()}>
                Select from your device
            </Button>
            <input ref={inputRef} type="file" accept={acceptedMediaTypes} multiple hidden
                onChange={event => {
                    if (event.currentTarget.files) onFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                }} />
        </div>
    );
}
