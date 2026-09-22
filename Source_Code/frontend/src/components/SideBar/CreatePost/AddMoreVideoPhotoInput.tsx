import { faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useRef } from "react";

const AddMoreVideoPhotoInput: React.FC<{ addMoreFile: Function }> = ({
    addMoreFile,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="absolute right-4 bottom-4 z-40">
            <div
                onClick={() => {
                    inputRef.current?.click();
                }}
            >
                <FontAwesomeIcon
                    icon={faPlusCircle}
                    className="w-8 h-auto cursor-pointer opacity-75 hover:opacity-100"
                />
            </div>
            <input
                ref={inputRef}
                type="file"
                name="file"
                id="file"
                accept="image/*|video/*"
                multiple
                className="absolute w-0"
                onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                        addMoreFile(files);
                    }
                }}
            />
        </div>
    );
};

export default AddMoreVideoPhotoInput;
