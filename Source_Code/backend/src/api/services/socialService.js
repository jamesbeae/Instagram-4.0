const { Op, QueryTypes } = require('sequelize');
const { sequelize, User, Post, Like, Comment, Save, Message, Notification, Interaction, Follow } = require('../../database/models');
const Joi = require('joi');
let realtime;
exports.setRealtime = io => { realtime = io; };
exports.disconnectUser = userId => realtime?.in("user:" + userId).disconnectSockets(true);
const error = exports.error = (status, message) => Object.assign(new Error(message), { status });
const id = exports.id = value => { if (Joi.string().uuid().required().validate(value).error)
    throw error(400, 'Invalid UUID'); return value; };
const safeUser = exports.safeUser = user => {
    const u = user.get ? user.get({ plain: true }) : user;
    return { id: u.id, _id: u.id, username: u.username, fullName: u.fullName, bio: u.bio, avatar: u.avatar };
};
const commentJSON = exports.commentJSON = c => {
    const data = c.get ? c.get({ plain: true }) : c;
    return { ...data, _id: data.id, userId: data.user ? safeUser(data.user) : data.userId, likes: [] };
};
const includes = exports.includes = [
    { model: User, as: 'user', attributes: ['id', 'username', 'fullName', 'avatar', 'bio'] },
    { model: Like, as: 'likes' },
    { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['id', 'username', 'fullName', 'avatar', 'bio'] }] },
    { model: Save, as: 'saves' }
];
exports.postJSON = (post, currentUserId) => {
    const p = post.get ? post.get({ plain: true }) : post;
    const { saves, ...data } = p;
    return { ...data, _id: p.id, caption: p.content, userId: p.user ? safeUser(p.user) : p.userId,
        photoVideo: p.media?.length ? p.media.map((m, i) => ({ ...m, _id: p.id + '-' + i })) : [{ _id: p.id, url: p.mediaUrl, type: /\.(mp4|webm|mov)(\?|$)/i.test(p.mediaUrl) ? 'VIDEO' : 'PHOTO' }],
        likes: (p.likes || []).map(l => ({ ...l, _id: l.id })), comments: (p.comments || []).map(commentJSON), isSaved: !!currentUserId && (saves || []).some(s => s.userId === currentUserId) };
};
const findPost = exports.findPost = async (postId, currentUserId) => {
    const post = await Post.findByPk(id(postId), { include: includes });
    if (!post)
        throw error(404, 'Post not found');
    await require('./accessService').assertView(post, currentUserId);
    return post;
};
exports.record = async (userId, type, postId, targetUserId, transaction) => Interaction.create({ userId, type, postId, targetUserId }, { transaction });
exports.notify = async (senderId, receiverId, type, postId, transaction) => {
    if (senderId === receiverId)
        return null;
    const sender = await User.findByPk(senderId, { transaction });
    const content = sender.username + ({ LIKE: ' liked your post', COMMENT: ' commented on your post', FOLLOW: ' started following you' }[type] || ' interacted with you');
    const n = await Notification.create({ senderId, receiverId, type, postId, content }, { transaction });
    return { ...n.get({ plain: true }), _id: n.id };
};
exports.emitNotification = (receiverId, data) => {
    if (!data)
        return;
    try {
        realtime?.to('user:' + receiverId).emit('receiveNotification', data);
    }
    catch (error) {
        console.error('Realtime notification delivery failed', error);
    }
};
exports.like = async (userId, postId) => {
    const post = await findPost(postId, userId);
    const [like, created, notification] = await sequelize.transaction(async (transaction) => {
        const result = await Like.findOrCreate({ where: { userId, postId }, transaction });
        if (result[1])
            await exports.record(userId, 'LIKE', postId, null, transaction);
        const notification = result[1] ? await exports.notify(userId, post.userId, 'LIKE', postId, transaction) : null;
        return [...result, notification];
    });
    if (created)
        exports.emitNotification(post.userId, notification);
    return { status: created ? 201 : 200, like: { ...like.get({ plain: true }), _id: like.id } };
};
exports.unlike = async (userId, postId) => {
    await findPost(postId, userId);
    await sequelize.transaction(async transaction => {
        const removed = await Like.destroy({ where: { userId, postId }, transaction });
        if (removed) await exports.record(userId, 'UNLIKE', postId, null, transaction);
    });
    return { status: 200, message: 'Like removed' };
};
exports.comment = async (userId, postId, content) => {
    const post = await findPost(postId, userId);
    if (typeof content !== 'string' || !content.trim() || content.length > 2200)
        throw error(400, 'Comment must contain 1–2200 characters');
    const { comment: c, notification } = await sequelize.transaction(async (transaction) => {
        const c = await Comment.create({ userId, postId, content: content.trim() }, { transaction });
        await exports.record(userId, 'COMMENT', postId, null, transaction);
        const notification = await exports.notify(userId, post.userId, 'COMMENT', postId, transaction);
        const comment = await Comment.findByPk(c.id, { include: [{ model: User, as: 'user' }], transaction });
        return { comment, notification };
    });
    exports.emitNotification(post.userId, notification);
    return { status: 201, comment: commentJSON(c) };
};
exports.comments = async (postId, currentUserId) => { await findPost(postId, currentUserId); return { status: 200, comments: (await Comment.findAll({ where: { postId }, include: [{ model: User, as: 'user' }], order: [['createdAt', 'DESC']] })).map(commentJSON) }; };
exports.save = async (userId, postId, saving) => {
    await findPost(postId, userId);
    if (saving)
        await sequelize.transaction(async (transaction) => {
            const [, created] = await Save.findOrCreate({ where: { userId, postId }, transaction });
            if (created)
                await exports.record(userId, 'SAVE', postId, null, transaction);
        });
    else
        await sequelize.transaction(async transaction => {
            const removed = await Save.destroy({ where: { userId, postId }, transaction });
            if (removed) await exports.record(userId, 'UNSAVE', postId, null, transaction);
        });
    return { status: 200, isSaved: saving };
};
const areMutualContacts = exports.areMutualContacts = async (userId, peerId, transaction) => {
    if (userId === peerId || Joi.string().uuid().required().validate(peerId).error) return false;
    const links = await Follow.findAll({
        where: { [Op.or]: [
            { followerId: userId, followingId: peerId },
            { followerId: peerId, followingId: userId },
        ] },
        ...(transaction && { transaction, lock: transaction.LOCK.SHARE }),
    });
    return links.length === 2;
};
exports.messageContactsChanged = (userId, peerId) => {
    realtime?.to(['user:' + userId, 'user:' + peerId]).emit('messageContactsChanged');
};
exports.messageInbox = async userId => {
    const contacts = await sequelize.query(`
        SELECT u.id, u.username, u.full_name AS "fullName", u.bio, u.avatar,
            EXISTS (
                SELECT 1 FROM messages m
                WHERE m.receiver_id = $userId AND m.sender_id = u.id AND m.read_at IS NULL
            ) AS unread
        FROM follows outbound
        JOIN follows inbound ON inbound.follower_id = outbound.following_id
            AND inbound.following_id = outbound.follower_id
        JOIN users u ON u.id = outbound.following_id AND u.disabled = false
        WHERE outbound.follower_id = $userId AND u.id <> $userId
        ORDER BY u.username
    `, { bind: { userId }, type: QueryTypes.SELECT });
    return { contacts: contacts.map(safeUser), unread: contacts.filter(contact => contact.unread).map(contact => contact.id) };
};
exports.markMessagesRead = async (receiverId, messageId) => {
    const message = await Message.findOne({ where: { id: id(messageId), receiverId } });
    if (!message) throw error(404, 'Message not found');
    const [updated] = await Message.update({ readAt: new Date() }, {
        where: { receiverId, senderId: message.senderId, readAt: null, createdAt: { [Op.lte]: message.createdAt } },
    });
    if (updated) realtime?.to('user:' + receiverId).emit('messageInboxChanged');
};
exports.createMessage = async (senderId, receiverId, contents) => {
    id(receiverId);
    if (typeof contents !== 'string' || !contents.trim() || contents.length > 4000)
        throw error(400, 'Message must contain 1–4000 characters');
    const message = await sequelize.transaction(async transaction => {
        if (!await User.findOne({ where: { id: receiverId, disabled: false }, transaction }))
            throw error(404, 'Recipient not found');
        if (!await areMutualContacts(senderId, receiverId, transaction))
            throw error(403, 'You can only message people who follow you back');
        return Message.create({ senderId, receiverId, contents: contents.trim() }, { transaction });
    });
    const data = exports.messageJSON(message);
    realtime?.to('user:' + receiverId).emit('receiveMessage', data);
    return data;
};
exports.messageJSON = message => { const m = message.get({ plain: true }); return { ...m, _id: m.id, sender_id: m.senderId, receiver_id: m.receiverId }; };
exports.getMessages = async (senderId, receiverId, { page = 1, limit = 50 } = {}) => {
    id(receiverId);
    if (!await User.findByPk(receiverId))
        throw error(404, 'Recipient not found');
    const messages = await Message.findAll({ where: { [Op.or]: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] }, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit });
    return messages.reverse().map(exports.messageJSON);
};
exports.notifications = async (receiverId) => ({ status: 200, notifications: (await Notification.findAll({ where: { receiverId }, order: [['createdAt', 'DESC']], limit: 100 })).map(n => ({ ...n.get({ plain: true }), _id: n.id })) });
exports.suggestedUsers = async (userId) => {
    const following = await Follow.findAll({ where: { followerId: userId }, attributes: ['followingId'] });
    const excluded = [userId, ...following.map(x => x.followingId)];
    return { status: 200, users: (await User.findAll({ where: { id: { [Op.notIn]: excluded }, disabled: false }, attributes: ['id', 'username', 'fullName', 'bio', 'avatar'], limit: 10, order: [['createdAt', 'DESC']] })).map(safeUser) };
};
