const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../../database/models');
const social = require('../services/socialService');
const allowOrigins = require('../../configs/allowOrigins');
module.exports = server => {
    const io = new Server(server, { cors: { origin: allowOrigins, credentials: true }, maxHttpBufferSize: 100000 });
    social.setRealtime(io);
    const online = new Map();
    io.use(async (socket, next) => {
        try {
            const decoded = jwt.verify(socket.handshake.auth?.token, process.env.ACCESS_TOKEN_CODE);
            social.id(decoded.userInfo?.id);
            const user = await User.findByPk(decoded.userInfo.id);
            if (!user || user.disabled || (decoded.userInfo.tokenVersion || 0) !== user.tokenVersion)
                throw new Error('Session revoked');
            socket.data.userId = decoded.userInfo.id;
            socket.data.expiresAt = decoded.exp * 1000;
            socket.data.tokenVersion = decoded.userInfo.tokenVersion || 0;
            next();
        }
        catch {
            next(new Error('Authentication required'));
        }
    });
    io.on('connection', socket => {
        const userId = socket.data.userId;
        socket.join('user:' + userId);
        online.set(userId, (online.get(userId) || 0) + 1);
        const presence = () => io.emit('onlineUsers', [...online.keys()]);
        presence();
        const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
        socket.on('addUser', () => socket.emit('onlineUsers', [...online.keys()]));
        const pendingTyping = new Map();
        socket.on('messageTyping', async payload => {
            const { receiverId, typing } = payload || {};
            if (typeof receiverId !== 'string' || receiverId.length !== 36 || typeof typing !== 'boolean') return;
            const pending = pendingTyping.get(receiverId);
            if (pending) {
                pending.typing = typing;
                return;
            }
            if (pendingTyping.size >= 8) return;
            const event = { typing };
            pendingTyping.set(receiverId, event);
            try {
                const user = await User.findByPk(userId);
                if (!user || user.disabled || user.tokenVersion !== socket.data.tokenVersion)
                    return;
                const recipient = await social.findMessageRecipient(userId, receiverId);
                if (recipient && socket.connected) {
                    io.to('user:' + recipient.id).volatile.emit('messageTyping', { senderId: userId, typing: event.typing });
                }
            } catch (error) {
                console.error('Unable to relay typing status:', error.message);
            } finally {
                pendingTyping.delete(receiverId);
            }
        });
        socket.on('sendMessage', async (payload = {}, ack) => {
            const respond = typeof ack === 'function' ? ack : result => socket.emit('messageError', result);
            try {
                const user = await User.findByPk(userId);
                if (!user || user.disabled || user.tokenVersion !== socket.data.tokenVersion)
                    throw social.error(401, 'Session revoked');
                if (payload.senderId && payload.senderId !== userId)
                    throw social.error(403, 'Sender does not match authenticated user');
                const message = await social.createMessage(userId, payload.receiverId, payload.contents, payload.messageId);
                respond({ ok: true, message });
            }
            catch (e) {
                respond({ ok: false, status: e.status || 500, message: e.status ? e.message : 'Unable to send message' });
            }
        });
        // Notifications are produced by committed server interactions, never by client claims.
        socket.on('sendNotification', () => socket.emit('notificationError', { message: 'Notifications are managed by the server' }));
        socket.on('disconnect', () => { clearTimeout(expiry); const count = (online.get(userId) || 1) - 1; if (count)
            online.set(userId, count);
        else
            online.delete(userId); presence(); });
    });
    return io;
};
