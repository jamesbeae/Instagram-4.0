import { AxiosInstance } from "axios";

const logout = async (privateHttp: AxiosInstance) => {
    try {
        const response = await privateHttp.post("/auth/logout");

        return {
            success: true as const,
            data: response.data,
        };
    } catch {
        return {
            success: false as const,
            message: "Đăng xuất thất bại",
        };
    }
};

export { logout };