import { AxiosInstance } from 'axios';
export const getChatHistory = (http: AxiosInstance, receiverId: string, page = 1, limit = 50) => http.get('/message', { params: { receiver_id: receiverId, page, limit } });
