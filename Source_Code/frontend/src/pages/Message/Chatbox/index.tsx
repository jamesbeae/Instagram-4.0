import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ChatBoxHeader from './ChatBoxHeader';
import ChatBoxInput from './ChatBoxInput';
import ChatBoxList from './ChatBoxList';
import usePrivateHttp from '../../../hooks/usePrivateHttp';
import { useAppSelector } from '../../../hooks/useStore';
import { socket } from '../../../socket/socket';
import { Message } from '../../../models/Message';
import { User } from '../../../models/User';
export default function ChatBox() {
    const { user_id } = useParams();
    const initialUser = useLocation().state?.user;
    const [user, setUser] = useState<User | undefined>(initialUser);
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState('');
    const currentUser = useAppSelector(s => s.authSlice.userInfo);
    const http = usePrivateHttp();
    useEffect(() => {
        let active = true;
        setMessages([]);
        setError('');
        if (!user_id)
            return;
        Promise.all([http.get('/user/get-profile', { params: { _id: user_id } }), http.get('/message', { params: { receiver_id: user_id } })])
            .then(([u, m]) => { if (active) {
            setUser(u.data.profile);
            setMessages(m.data);
        } })
            .catch(() => { if (active)
            setError('Unable to load conversation'); });
        return () => { active = false; };
    }, [user_id, http]);
    useEffect(() => {
        const receive = (m: Message) => { if (m.sender_id === user_id && m.receiver_id === currentUser?._id)
            setMessages(prev => prev.some(x => x._id === m._id) ? prev : [...prev, m]); };
        socket.on('receiveMessage', receive);
        return () => { socket.off('receiveMessage', receive); };
    }, [user_id, currentUser?._id]);
    const sendMessage = async (contents: string) => {
        if (!contents.trim() || !user_id)
            return false;
        if (!socket.connected) {
            setError('Connection unavailable. Please try again.');
            return false;
        }
        return new Promise<boolean>(resolve => socket.timeout(10000).emit('sendMessage', { receiverId: user_id, contents }, (err: any, result: any) => {
            if (err || !result?.ok) {
                setError(result?.message || 'Unable to send message');
                resolve(false);
                return;
            }
            setError('');
            setMessages(prev => [...prev, result.message]);
            resolve(true);
        }));
    };
    if (!user)
        return <p role="status" className="text-white p-6">{error || 'Loading conversation…'}</p>;
    return <div className="flex-1 h-full flex flex-col"><ChatBoxHeader user={user}/>{error && <p role="alert" className="text-red-400 p-2">{error}</p>}<ChatBoxList messages={messages} sendingUser={user}/><ChatBoxInput sendMessage={sendMessage}/></div>;
}
