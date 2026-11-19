import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../../../socket/socket";

const heartbeatMs = 1500;
const idleMs = 2500;
const remoteTimeoutMs = 4500;

export default function useConversationTyping(peerId?: string) {
    const [isTyping, setIsTyping] = useState(false);
    const localTimer = useRef<number>();
    const lastSent = useRef(0);

    const stopTyping = useCallback(() => {
        window.clearTimeout(localTimer.current);
        if (lastSent.current && socket.connected && peerId) {
            socket.volatile.emit("messageTyping", { receiverId: peerId, typing: false });
        }
        lastSent.current = 0;
    }, [peerId]);

    const updateTyping = useCallback((draft: string) => {
        if (!draft.trim()) {
            stopTyping();
            return;
        }
        if (!peerId || !socket.connected) return;

        const now = Date.now();
        if (now - lastSent.current >= heartbeatMs) {
            socket.volatile.emit("messageTyping", { receiverId: peerId, typing: true });
            lastSent.current = now;
        }
        window.clearTimeout(localTimer.current);
        localTimer.current = window.setTimeout(stopTyping, idleMs);
    }, [peerId, stopTyping]);

    useEffect(() => {
        let remoteTimer: number | undefined;
        function clearRemote() {
            window.clearTimeout(remoteTimer);
            setIsTyping(false);
        }
        function receive({ senderId, typing }: { senderId: string; typing: boolean }) {
            if (senderId !== peerId) return;
            window.clearTimeout(remoteTimer);
            setIsTyping(typing);
            if (typing) remoteTimer = window.setTimeout(clearRemote, remoteTimeoutMs);
        }

        clearRemote();
        socket.on("messageTyping", receive);
        socket.on("disconnect", clearRemote);
        return () => {
            stopTyping();
            window.clearTimeout(remoteTimer);
            socket.off("messageTyping", receive);
            socket.off("disconnect", clearRemote);
        };
    }, [peerId, stopTyping]);

    return { isTyping, updateTyping, stopTyping };
}
