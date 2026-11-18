import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef } from "react";
import Button from "../../UI/Button/Button";
import { acceptedMediaTypes } from "./PhotoVideoInput";

export default function AddMoreVideoPhotoInput({ onFiles, busy }: {
    onFiles: (files: FileList) => void;
    busy: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex justify-end">
            <Button className="create-post-add-media" disabled={busy} onClick={() => inputRef.current?.click()}>
                <FontAwesomeIcon icon={faPlus} aria-hidden="true" /> Add more
            </Button>
            <input ref={inputRef} type="file" accept={acceptedMediaTypes} multiple hidden
                onChange={event => {
                    if (event.currentTarget.files) onFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                }} />
        </div>
    );
}
