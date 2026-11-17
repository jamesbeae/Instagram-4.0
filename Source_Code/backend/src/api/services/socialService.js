const { Op } = require('sequelize');
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
const notify = exports.notify = async (senderId, receiverId, type, postId) => {
    if (senderId === receiverId)
        return;
    const sender = await User.findByPk(senderId);
    const content = sender.username + ({ LIKE: ' liked your post', COMMENT: ' commented on your post', FOLLOW: ' started following you' }[type] || ' interacted with you');
    const n = await Notification.create({ senderId, receiverId, type, postId, content });
    const data = { ...n.get({ plain: true }), _id: n.id };
    realtime?.to('user:' + receiverId).emit('receiveNotification', data);
};
exports.like = async (userId, postId) => {
    const post = await findPost(postId, userId);
    const [like, created] = await sequelize.transaction(async (transaction) => {
        const result = await Like.findOrCreate({ where: { userId, postId }, transaction });
        if (result[1])
            await exports.record(userId, 'LIKE', postId, null, transaction);
        return result;
    });
    if (created)
        await notify(userId, post.userId, 'LIKE', postId);
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
    const c = await sequelize.transaction(async (transaction) => {
        const c = await Comment.create({ userId, postId, content: content.trim() }, { transaction });
        await exports.record(userId, 'COMMENT', postId, null, transaction);
        return c;
    });
    await c.reload({ include: [{ model: User, as: 'user' }] });
    await notify(userId, post.userId, 'COMMENT', postId);
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
exports.createMessage = async (senderId, receiverId, contents) => {
    id(receiverId);
    if (typeof contents !== 'string' || !contents.trim() || contents.length > 4000)
        throw error(400, 'Message must contain 1–4000 characters');
    if (!await User.findOne({ where: { id: receiverId, disabled: false } }))
        throw error(404, 'Recipient not found');
    const message = await Message.create({ senderId, receiverId, contents: contents.trim() });
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
