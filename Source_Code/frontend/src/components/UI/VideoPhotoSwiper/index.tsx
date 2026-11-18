import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import SwiperPaginationNavigation from "../SwiperPaginationNavigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import Button from "../Button/Button";
import { PhotoVideo } from "../../../models/PhotoVideo";

const VideoPhotoSwiper: React.FC<{
    videoPhotoList: PhotoVideo[];
    deleteVideoPhoto?: (index: number) => void;
}> = ({ videoPhotoList, deleteVideoPhoto }) => {
    return (
        <Swiper grabCursor centeredSlides slidesPerView={1} className="my-auto swiper-container relative h-full"
            modules={[Navigation, Pagination]} pagination={{ el: ".swiper-pagination", clickable: true }}
            navigation={{ prevEl: ".swiper-button-prev", nextEl: ".swiper-button-next" }} wrapperClass="h-full">
            {videoPhotoList.map((item, index) => (
                <SwiperSlide key={item._id ?? index} className="h-auto">
                    {item.type === "PHOTO" && typeof item.url === "string"
                        ? <img src={item.url} alt={deleteVideoPhoto ? `Photo ${index + 1}` : item._id} className="w-full h-full object-contain" />
                        : <video controls muted playsInline className="object-cover w-full h-full">
                            <source src={item.url} />
                        </video>}
                    {deleteVideoPhoto && (
                        <Button aria-label="Remove media" onClick={() => deleteVideoPhoto(index)}
                            className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-dark text-white">
                            <FontAwesomeIcon icon={faCircleXmark} />
                        </Button>
                    )}
                </SwiperSlide>
            ))}
            <SwiperPaginationNavigation />
        </Swiper>
    );
};
export default VideoPhotoSwiper;
