import AddMoreVideoPhotoInput from "./AddMoreVideoPhotoInput";
import VideoPhotoSwiper from "../../UI/VideoPhotoSwiper";
import { PhotoVideo } from "../../../models/PhotoVideo";

export default function PhotoVideoPreview({ media, onAdd, onRemove, busy, accept, multiple = true, addLabel }: {
    media: PhotoVideo[];
    onAdd: (files: FileList) => void;
    onRemove: (index: number) => void;
    busy: boolean;
    accept?: string;
    multiple?: boolean;
    addLabel?: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="create-post-preview">
                <VideoPhotoSwiper videoPhotoList={media} deleteVideoPhoto={busy ? undefined : onRemove} />
            </div>
            <AddMoreVideoPhotoInput onFiles={onAdd} busy={busy} accept={accept} multiple={multiple} label={addLabel} />
        </div>
    );
}
