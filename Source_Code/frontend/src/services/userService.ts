import { AxiosInstance } from "axios";
import http from "../lib/axios/http";

// Get All User Service:
export const getAllUsers = async () => {
    try {
        const res = await http.get("/user/get-all-users");
        return res;
    } catch (error) {
        console.log(error);
    }
};

// Get All User Service:
export const getSuggestedUsers = async (privateHttp: AxiosInstance) => {
    try {
        const res = await privateHttp.get("/user/get-suggested-users");
        return res;
    } catch (error) {
        console.log(error);
    }
};

// Get User Profile Service:
export const getUserProfile = (
    privateHttp: AxiosInstance,
    profileId: string
) => {
    return privateHttp.get("/user/get-profile", {
        params: {
            _id: profileId,
        },
    });
};

// Create Follow Service:
export const createFollow = (
    privateHttp: AxiosInstance,
    userId: string
) => {
    return privateHttp.post("/user/create-follow", {
        userId,
    });
};

// Delete Follow Service:
export const deleteFollow = (
    privateHttp: AxiosInstance,
    userId: string
) => {
    return privateHttp.post("/user/delete-follow", {
        userId,
    });
};
