import { useCallback, useRef, useState } from "react";
import AddPostIcon from "../../UI/Icons/AddPostIcon";
import Button from "../../UI/Button/Button";

const PhotoVideoInput: React.FC<{ getFilesListsHandler: Function }> = ({ getFilesListsHandler }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const clickInputHandler = useCallback(() => { inputRef.current?.click(); }, []);
    return (<div className="relative min-h-[240px] sm:h-full w-full sm:w-3/5 shrink-0 flex flex-col gap-6 items-center justify-center" onDragEnter={() => setIsDragging(true)}>
        <AddPostIcon />
        <p className="text-xl text-white text-center">Drag photos and videos here</p>
        <Button className="relative z-40 py-2 px-3 rounded-lg font-semibold bg-blue text-white cursor-pointer" content="Select from your device" onClick={clickInputHandler} />
        <input ref={inputRef} type="file" name="file" id="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple className={"absolute h-full w-full left-0 right-0 opacity-0 " + (isDragging ? "z-30" : "-z-10")} onChange={e => {
            if (e.target.files) getFilesListsHandler(e.target.files);
            setIsDragging(false);
        }} />
    </div>);
};
export default PhotoVideoInput;
