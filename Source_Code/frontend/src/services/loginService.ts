import axios from "axios";
import { z } from "zod";
import http from "../lib/axios/http";

// Login with Facebook.
// Backend PostgreSQL hiện chưa hỗ trợ chức năng này.
const loginWithFacebook = async (data: { accessToken?: string }) => {
    try {
        const response = await http.post("/auth/login-with-facebook", {
            accessToken: data.accessToken,
        });

        return {
            success: true as const,
            data: response.data,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                success: false as const,
                message:
                    error.response?.data?.message ||
                    "Facebook Login chưa được hỗ trợ",
            };
        }

        return {
            success: false as const,
            message: "Không thể kết nối tới máy chủ",
        };
    }
};

// Kiểm tra dữ liệu đăng nhập ở frontend.
const loginDataSchema = z.object({
    username: z.string().min(1, {
        message: "Bạn chưa nhập username",
    }),
    password: z.string().min(1, {
        message: "Bạn chưa nhập mật khẩu",
    }),
});

type LoginData = z.infer<typeof loginDataSchema>;

const validateLoginData = (data: LoginData) => {
    return loginDataSchema.safeParse(data);
};

// Gọi API đăng nhập.
const login = async (data: LoginData) => {
    try {
        const response = await http.post("/auth/login", data);

        return {
            success: true as const,
            data: response.data,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message;

            if (message === "username") {
                return {
                    success: false as const,
                    message: "Username không tồn tại",
                };
            }

            if (message === "password") {
                return {
                    success: false as const,
                    message: "Mật khẩu không đúng",
                };
            }

            return {
                success: false as const,
                message: message || "Đăng nhập thất bại",
            };
        }

        return {
            success: false as const,
            message: "Không thể kết nối tới máy chủ",
        };
    }
};

const loginService = {
    loginWithFacebook,
    validateLoginData,
    login,
};

export default loginService;