import axios from "axios";
import http from "../lib/axios/http";
import { z } from "zod";

const signUpDataSchema = z.object({
    email: z.string().email({
        message: "Email không hợp lệ",
    }),
    fullName: z.string().min(3, {
        message: "Họ tên phải có ít nhất 3 ký tự",
    }),
    username: z.string().min(3, {
        message: "Username phải có ít nhất 3 ký tự",
    }),
    password: z.string().regex(/^[a-zA-Z0-9]{8,30}$/, {
        message:
            "Mật khẩu phải dài từ 8 đến 30 ký tự và chỉ chứa chữ hoặc số",
    }),
});

export type SignupData = z.infer<typeof signUpDataSchema>;

export const validateSignUpData = (data: SignupData) => {
    return signUpDataSchema.safeParse(data);
};

export const signUp = async (data: SignupData) => {
    try {
        const response = await http.post("/auth/register", data);

        return {
            success: true as const,
            data: response.data,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                success: false as const,
                status: error.response?.status,
                message:
                    error.response?.data?.message ||
                    "Không thể đăng ký tài khoản",
            };
        }

        return {
            success: false as const,
            message: "Không thể kết nối tới máy chủ",
        };
    }
};