import axios from "axios";

const baseURL = import.meta.env.VITE_REACT_API_URL;

const http = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

const privateHttp = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

export default http;
export { privateHttp };