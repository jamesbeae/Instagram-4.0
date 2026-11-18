import AddMoreVideoPhotoInput from "./AddMoreVideoPhotoInput";
import VideoPhotoSwiper from "../../UI/VideoPhotoSwiper";
import { PhotoVideo } from "../../../models/PhotoVideo";

export default function PhotoVideoPreview({ media, onAdd, onRemove, busy }: {
    media: PhotoVideo[];
    onAdd: (files: FileList) => void;
    onRemove: (index: number) => void;
    busy: boolean;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="create-post-preview">
                <VideoPhotoSwiper videoPhotoList={media} deleteVideoPhoto={busy ? undefined : onRemove} />
            </div>
            <AddMoreVideoPhotoInput onFiles={onAdd} busy={busy} />
        </div>
    );
}
