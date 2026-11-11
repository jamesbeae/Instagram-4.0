import React, { useCallback } from "react";
// import { VideoPhoto } from "./CreatePostModal";
import AddMoreVideoPhotoInput from "./AddMoreVideoPhotoInput";
import VideoPhotoSwiper from "../../UI/VideoPhotoSwiper";
import { PhotoVideo } from "../../../models/PhotoVideo";

const PhotoVideoPreview: React.FC<{
    photoVideoList: PhotoVideo[];
    getFilesListsHandler: Function;
    deleteVideoPhotoHandler: Function;
}> = ({ photoVideoList, getFilesListsHandler, deleteVideoPhotoHandler }) => {
    const addMoreFile = useCallback((files: FileList) => {
        getFilesListsHandler(files);
    }, []);

    return (
        <div className="h-[280px] sm:h-full w-full sm:w-3/5 shrink-0 relative">
            <VideoPhotoSwiper
                videoPhotoList={photoVideoList}
                deleteVideoPhoto={deleteVideoPhotoHandler}
            />
            <AddMoreVideoPhotoInput addMoreFile={addMoreFile} />
        </div>
    );
};

export default PhotoVideoPreview;
