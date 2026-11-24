import { z } from 'zod';
import { AxiosInstance } from 'axios';
const createPostSchema = z.object({ kind: z.enum(['POST', 'STORY', 'REEL']).optional(), visibility: z.enum(['public', 'followers', 'group']).optional(), groupId: z.string().uuid().optional(), photoVideoList: z.array(z.object({ url: z.string().min(1), type: z.enum(['VIDEO', 'PHOTO']) })).min(1).max(10), caption: z.string().trim().max(2200).optional() }).superRefine((data, context) => {
    if (data.kind === 'REEL' && (data.photoVideoList.length !== 1 || data.photoVideoList[0].type !== 'VIDEO')) context.addIssue({ code: z.ZodIssueCode.custom, message: 'A Reel must contain exactly one video' });
});
type CreatePostData = z.infer<typeof createPostSchema>;
export const validateCreatePostData = (data: CreatePostData) => createPostSchema.safeParse(data);
export const createPost = (http: AxiosInstance, data: CreatePostData) => http.post('/post/create-post', data);
export const getAllPosts = (http: AxiosInstance, page = 1) => http.get('/post/get-all-posts', { params: { page, limit: 10 } });
export const getFollowingPosts = (http: AxiosInstance) => http.get('/post/recommended');
