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
    return { ...data, _id: data.id, userId: data.user ? safeUser(data.user) : data.userId, parentCommentId: data.parentCommentId || null,
        likes: (data.likes || []).map(like => ({ _id: like.id, userId: like.userId })) };
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
exports.notify = async (senderId, receiverId, type, postId, transaction, actionText) => {
    if (senderId === receiverId)
        return null;
    const sender = await User.findByPk(senderId, { transaction });
    const content = sender.username + (actionText || ({ LIKE: ' liked your post', COMMENT: ' commented on your post', FOLLOW: ' started following you' }[type] || ' interacted with you'));
    const n = await Notification.create({ senderId, receiverId, type, postId, content }, { transaction });
    return { ...n.get({ plain: true }), _id: n.id, sender: safeUser(sender) };
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
exports.comment = async (userId, postId, content, parentCommentId) => {
    const post = await findPost(postId, userId);
    if (typeof content !== 'string' || !content.trim() || content.length > 2200)
        throw error(400, 'Comment must contain 1–2200 characters');
    let parent = null;
    if (parentCommentId) {
        parent = await Comment.findByPk(id(parentCommentId));
        if (!parent || parent.postId !== post.id) throw error(400, 'Reply target is not part of this post');
    }
    const { comment: c, notification } = await sequelize.transaction(async (transaction) => {
        const c = await Comment.create({ userId, postId, parentCommentId: parent?.id || null, content: content.trim() }, { transaction });
        await exports.record(userId, parent ? 'COMMENT_REPLY' : 'COMMENT', postId, parent?.userId || null, transaction);
        const receiverId = parent ? parent.userId : post.userId;
        const notification = await exports.notify(userId, receiverId, parent ? 'COMMENT_REPLY' : 'COMMENT', postId, transaction, parent ? ' replied to your comment' : undefined);
        const comment = await Comment.findByPk(c.id, { include: [{ model: User, as: 'user' }], transaction });
        return { comment, notification };
    });
    exports.emitNotification(parent ? parent.userId : post.userId, notification);
    return { status: 201, comment: commentJSON(c) };
};
exports.comments = async (postId, currentUserId) => { await findPost(postId, currentUserId); return { status: 200, comments: (await Comment.findAll({ where: { postId }, include: [{ model: User, as: 'user' }, { model: Like, as: 'likes', attributes: ['id', 'userId'] }], order: [['createdAt', 'DESC']] })).map(commentJSON) }; };
exports.likeComment = async (userId, commentId) => {
    const comment = await Comment.findByPk(id(commentId));
    if (!comment) throw error(404, 'Comment not found');
    const post = await findPost(comment.postId, userId);
    const { like, created, notification } = await sequelize.transaction(async transaction => {
        const [like, created] = await Like.findOrCreate({ where: { userId, commentId: comment.id }, defaults: { postId: null }, transaction });
        if (created) await exports.record(userId, 'COMMENT_LIKE', post.id, comment.userId, transaction);
        const notification = created ? await exports.notify(userId, comment.userId, 'COMMENT_LIKE', post.id, transaction, ' liked your comment') : null;
        return { like, created, notification };
    });
    if (created) exports.emitNotification(comment.userId, notification);
    return { status: created ? 201 : 200, like: { _id: like.id, userId, commentId: comment.id } };
};
exports.unlikeComment = async (userId, commentId) => {
    const comment = await Comment.findByPk(id(commentId));
    if (!comment) throw error(404, 'Comment not found');
    const post = await findPost(comment.postId, userId);
    await sequelize.transaction(async transaction => {
        const removed = await Like.destroy({ where: { userId, commentId: comment.id }, transaction });
        if (removed) await exports.record(userId, 'COMMENT_UNLIKE', post.id, comment.userId, transaction);
    });
    return { status: 200, message: 'Comment like removed' };
};
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
const findMessageRecipient = exports.findMessageRecipient = async (userId, peerId, transaction) => {
    if (Joi.string().uuid().required().validate(peerId).error || userId === peerId.toLowerCase()) return null;
    return User.findOne({
        where: { id: peerId, disabled: false },
        attributes: ['id', 'username', 'fullName', 'bio', 'avatar'],
        ...(transaction && { transaction, lock: transaction.LOCK.SHARE }),
    });
};
exports.messageInbox = async userId => {
    const peers = await sequelize.query(`
        WITH peers AS (
            SELECT receiver_id AS peer_id FROM messages WHERE sender_id = $userId
            UNION SELECT sender_id FROM messages WHERE receiver_id = $userId
        )
        SELECT u.id, u.username, u.full_name AS "fullName", u.bio, u.avatar,
            (SELECT COUNT(*)::int FROM messages m
                WHERE m.receiver_id = $userId AND m.sender_id = u.id AND m.read_at IS NULL
            ) AS "unreadCount",
            last_message.contents AS "lastMessageContents",
            last_message.sender_id AS "lastMessageSenderId",
            last_message.created_at AS "lastMessageCreatedAt"
        FROM peers
        JOIN users u ON u.id = peers.peer_id
        JOIN LATERAL (
            SELECT m.contents, m.sender_id, m.created_at
            FROM messages m
            WHERE (m.sender_id = $userId AND m.receiver_id = u.id)
                OR (m.sender_id = u.id AND m.receiver_id = $userId)
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ) last_message ON true
        WHERE u.id <> $userId
        ORDER BY last_message.created_at DESC, u.username
    `, { bind: { userId }, type: QueryTypes.SELECT });
    const toInboxUser = peer => ({
        ...safeUser(peer),
        lastMessage: peer.lastMessageContents == null ? null : {
            contents: peer.lastMessageContents,
            senderId: peer.lastMessageSenderId,
            createdAt: peer.lastMessageCreatedAt,
        },
    });
    return {
        contacts: peers.map(toInboxUser),
        unread: peers.filter(peer => peer.unreadCount > 0).map(peer => peer.id),
        unreadCount: peers.reduce((total, peer) => total + peer.unreadCount, 0),
    };
};
exports.markMessagesRead = async (receiverId, messageId) => {
    const message = await Message.findOne({ where: { id: id(messageId), receiverId } });
    if (!message) throw error(404, 'Message not found');
    const [updated] = await Message.update({ readAt: new Date() }, {
        where: { receiverId, senderId: message.senderId, readAt: null, createdAt: { [Op.lte]: message.createdAt } },
    });
    if (updated) realtime?.to('user:' + receiverId).emit('messageInboxChanged');
};
exports.createMessage = async (senderId, receiverId, contents, messageId) => {
    id(receiverId);
    if (senderId === receiverId.toLowerCase()) throw error(400, 'You cannot message yourself');
    if (messageId !== undefined)
        messageId = id(messageId);
    if (typeof contents !== 'string' || !contents.trim() || contents.length > 4000)
        throw error(400, 'Message must contain 1–4000 characters');
    const values = { senderId, receiverId, contents: contents.trim() };
    const { message, created } = await sequelize.transaction(async transaction => {
        if (messageId) {
            const existing = await Message.findByPk(messageId, { transaction });
            if (existing)
                return { message: existing, created: false };
        }
        if (!await findMessageRecipient(senderId, receiverId, transaction))
            throw error(404, 'Recipient not found');
        if (!messageId)
            return { message: await Message.create(values, { transaction }), created: true };
        const [message, created] = await Message.findOrCreate({
            where: { id: messageId }, defaults: values, transaction,
        });
        return { message, created };
    });
    if (message.senderId !== senderId || message.receiverId !== receiverId.toLowerCase() || message.contents !== values.contents)
        throw error(409, 'Message ID already used');
    const data = exports.messageJSON(message);
    if (created) {
        realtime?.to('user:' + message.receiverId).emit('receiveMessage', data);
        realtime?.to(['user:' + senderId, 'user:' + message.receiverId]).emit('messageInboxChanged');
    }
    return data;
};
exports.messageJSON = message => { const m = message.get({ plain: true }); return { ...m, _id: m.id, sender_id: m.senderId, receiver_id: m.receiverId }; };
exports.getMessages = async (senderId, receiverId, { page = 1, limit = 50, before = null } = {}) => {
    id(receiverId);
    if (!await User.findByPk(receiverId))
        throw error(404, 'Recipient not found');
    const messages = await sequelize.query(`
        WITH conversation AS NOT MATERIALIZED (
            SELECT * FROM messages
            WHERE (sender_id = $senderId AND receiver_id = $receiverId)
                OR (sender_id = $receiverId AND receiver_id = $senderId)
        )
        SELECT * FROM conversation
        WHERE $before::uuid IS NULL OR (created_at, id) < (
            SELECT created_at, id FROM conversation WHERE id = $before
        )
        ORDER BY created_at DESC, id DESC
        LIMIT $limit OFFSET $offset
    `, {
        bind: { senderId, receiverId, before, limit, offset: before ? 0 : (page - 1) * limit },
        model: Message, mapToModel: true, type: QueryTypes.SELECT,
    });
    return messages.reverse().map(exports.messageJSON);
};
exports.notifications = async (receiverId) => ({ status: 200, notifications: (await Notification.findAll({ where: { receiverId }, include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'fullName', 'avatar'] }], order: [['createdAt', 'DESC']], limit: 100 })).map(n => ({ ...n.get({ plain: true }), _id: n.id, sender: n.sender ? safeUser(n.sender) : null })) });
exports.suggestedUsers = async (userId) => {
    const following = await Follow.findAll({ where: { followerId: userId }, attributes: ['followingId'] });
    const excluded = [userId, ...following.map(x => x.followingId)];
    return { status: 200, users: (await User.findAll({ where: { id: { [Op.notIn]: excluded }, disabled: false }, attributes: ['id', 'username', 'fullName', 'bio', 'avatar'], limit: 10, order: [['createdAt', 'DESC']] })).map(safeUser) };
};
