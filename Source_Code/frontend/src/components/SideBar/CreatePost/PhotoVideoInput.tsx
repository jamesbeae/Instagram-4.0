import { useRef, useState } from "react";
import { faImage } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../UI/Button/Button";

export const acceptedMediaTypes = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

export default function PhotoVideoInput({ onFiles, busy, accept = acceptedMediaTypes, multiple = true,
    title = "Drag photos and videos here", hint }: {
    onFiles: (files: FileList) => void;
    busy: boolean;
    accept?: string;
    multiple?: boolean;
    title?: string;
    hint?: string;
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
            <p>{title}</p>
            {hint && <p className="text-sm text-textGray">{hint}</p>}
            <Button variant="primary" className="create-post-select-files" disabled={busy} onClick={() => inputRef.current?.click()}>
                Select from your device
            </Button>
            <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden
                onChange={event => {
                    if (event.currentTarget.files) onFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                }} />
        </div>
    );
}
