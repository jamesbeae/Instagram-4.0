import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import SwiperPaginationNavigation from "../SwiperPaginationNavigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { PhotoVideo } from "../../../models/PhotoVideo";
const DeleteVideoPhotoBtn: React.FC<{
    onClick: Function;
}> = ({ onClick }) => {
    return (<FontAwesomeIcon icon={faCircleXmark} className="absolute top-2 right-2" onClick={() => {
            onClick();
        }}/>);
};
const VideoPhotoSwiper: React.FC<{
    videoPhotoList: PhotoVideo[];
    deleteVideoPhoto?: Function;
}> = ({ videoPhotoList, deleteVideoPhoto }) => {
    return (<Swiper grabCursor={true} centeredSlides={true} slidesPerView={1} className="my-auto swiper-container relative h-full" modules={[Navigation, Pagination]} pagination={{ el: ".swiper-pagination", clickable: true }} navigation={{
            prevEl: ".swiper-button-prev",
            nextEl: ".swiper-button-next",
        }} wrapperClass="h-full">
            {videoPhotoList.map((item: PhotoVideo, index) => {
            return (<SwiperSlide key={item._id + index.toString()} className="h-auto">
                        {item.type === "PHOTO" &&
                    typeof item.url === "string" ? (<img src={item.url} alt={item._id} className="w-full h-full object-contain"/>) : (<video controls muted playsInline className="object-cover w-full h-full">
                                <source src={item.url}/>
                            </video>)}

                        {deleteVideoPhoto && (<DeleteVideoPhotoBtn onClick={() => {
                        deleteVideoPhoto(index);
                    }}/>)}
                    </SwiperSlide>);
        })}
            <SwiperPaginationNavigation />
        </Swiper>);
};
export default VideoPhotoSwiper;
