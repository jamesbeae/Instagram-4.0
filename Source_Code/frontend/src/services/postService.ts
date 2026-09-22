import { z } from "zod";
import { AxiosError, AxiosInstance } from "axios";

// Validate Create Post Data
const photoVideoSchema = z.object({
    url: z.string().min(1),
    type: z.enum(["VIDEO", "PHOTO"]),
});
const createPostSchema = z.object({
    photoVideoList: photoVideoSchema
        .array()
        .min(1, { message: "Please choose your photo or video!" }),
    caption: z.string().min(1, { message: "Please enter your caption!" })
});
type CreatePostData = z.infer<typeof createPostSchema>;

const validateCreatePostData = (data: CreatePostData) => {
    const result = createPostSchema.safeParse(data);
    return result;
};

// Create Post
const createPost = async (privateHttp: AxiosInstance, data: CreatePostData) => {
    try {
        const res = await privateHttp.post("/post/create-post", data);
        return res;
    } catch (error) {
        console.log(error);
        if (error instanceof AxiosError) {
            return error.response;
        }
    }
};

// Get All Post:
const getAllPosts = async (http: AxiosInstance) => {
    try {
        const res = await http.get("/post/get-all-posts");
        return res;
    } catch (error) {
        console.log(error);
        if (error instanceof AxiosError) {
            return error.response;
        }
    }
};

// Get Following Post:
const getFollowingPosts = async (privateHttp: AxiosInstance) => {
    try {
        const res = privateHttp.get("/post/get-following-posts");
        return res;
    } catch (error) {
        console.log(error);
        if (error instanceof AxiosError) {
            return error.response;
        }
    }
};

export { validateCreatePostData, createPost, getAllPosts, getFollowingPosts };
