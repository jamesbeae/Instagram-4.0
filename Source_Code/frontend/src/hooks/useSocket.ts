import { useEffect } from 'react';
import { useAppSelector } from './useStore';
import { socket } from '../socket/socket';
export const useSocket = (userId?: string) => {
    const token = useAppSelector(s => s.authSlice.accessToken);
    useEffect(() => {
        if (!userId || !token) {
            socket.disconnect();
            return;
        }
        socket.auth = { token };
        socket.connect();
        return () => { socket.disconnect(); };
    }, [userId, token]);
};
