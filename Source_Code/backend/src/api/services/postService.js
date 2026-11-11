const { Post, sequelize } = require('../../database/models');
const social = require('./socialService');
const { prepareMedia, removeMedia } = require('./mediaService');
exports.createPost = async ({ content, mediaUrl, photoVideoList, userId, kind = "POST", visibility = "public", groupId }) => {
    if (visibility === 'group') {
        const { Group } = require('../../database/models');
        const group = await Group.findByPk(social.id(groupId));
        if (!group || group.ownerId !== userId)
            throw social.error(403, 'You may only share to your own relation lists');
    }
    const media = await prepareMedia(photoVideoList || [{ url: mediaUrl, type: /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl) ? 'VIDEO' : 'PHOTO' }]);
    try {
        const post = await Post.create({ content, mediaUrl: media[0].url, media, userId, kind, visibility, groupId: visibility === 'group' ? groupId : null, expiresAt: kind === 'STORY' ? new Date(Date.now() + 24 * 3600000) : null });
        return { status: 201, post: social.postJSON(await social.findPost(post.id, userId), userId) };
    }
    catch (e) {
        await removeMedia(media);
        throw e;
    }
};
exports.getFeed = async ({ page, limit, currentUserId }) => {
    const { count, rows } = await Post.findAndCountAll({ where: { ...require("./accessService").visibleWhere(currentUserId), kind: "POST" }, include: social.includes, distinct: true, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit });
    return { status: 200, postsList: rows.map(p => social.postJSON(p, currentUserId)), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
};
exports.getPostDetail = async (postId, currentUserId) => ({ status: 200, post: social.postJSON(await social.findPost(postId, currentUserId), currentUserId) });
exports.deletePost = async ({ postId, userId }) => {
    const post = await Post.findByPk(social.id(postId));
    if (!post)
        throw social.error(404, "Post not found");
    if (post.userId !== userId)
        throw social.error(403, 'You can only delete your own posts');
    const media = post.media;
    await sequelize.transaction(transaction => Post.destroy({ where: { id: postId, userId }, transaction }));
    await removeMedia(media);
    return { status: 200, message: 'Post deleted' };
};

exports.updatePost = async ({ postId, userId, content, mediaUrl }) => {
    const oldMedia = await sequelize.transaction(async transaction => {
        const post = await Post.findByPk(social.id(postId), { transaction, lock: transaction.LOCK.UPDATE });
        if (!post) throw social.error(404, 'Post not found');
        if (post.userId !== userId) throw social.error(403, 'You may only edit your own posts');
        await require('./accessService').assertView(post, userId);
        const previous = post.media || [];
        const update = content === undefined ? {} : { content };
        if (mediaUrl !== undefined && mediaUrl !== post.mediaUrl) {
            update.media = await prepareMedia([{ url: mediaUrl, type: /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl) ? 'VIDEO' : 'PHOTO' }]);
            update.mediaUrl = mediaUrl;
        }
        await post.update(update, { transaction });
        return update.media ? previous : [];
    });
    await removeMedia(oldMedia);
    return { status: 200, post: social.postJSON(await social.findPost(postId, userId), userId) };
};
