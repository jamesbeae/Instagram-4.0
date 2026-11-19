const { Op } = require('sequelize');
const { User, Follow, Post, Save, sequelize } = require('../../database/models');
const s = require('./socialService');
exports.getAllUsers = async () => ({ status: 200, users: (await User.findAll({ where: { disabled: false }, attributes: ['id', 'username', 'fullName', 'bio', 'avatar'], order: [['username', 'ASC']], limit: 500 })).map(s.safeUser) });
exports.getSuggestedUsers = s.suggestedUsers;
exports.getUserProfile = async (profileId, currentUserId) => {
    const user = await User.findByPk(s.id(profileId));
    if (!user || user.disabled)
        throw s.error(404, 'User not found');
    const [followers, following, posts, saved] = await Promise.all([
        Follow.findAll({ where: { followingId: profileId } }), Follow.findAll({ where: { followerId: profileId } }),
        Post.findAll({ where: { userId: profileId, kind: 'POST', ...require('./accessService').visibleWhere(currentUserId) }, include: s.includes, order: [['createdAt', 'DESC']] }),
        profileId === currentUserId ? Save.findAll({ where: { userId: profileId }, include: [{ model: Post, as: 'post', include: s.includes }], order: [['createdAt', 'DESC']] }) : []
    ]);
    const users = async (ids) => ids.length ? (await User.findAll({ where: { id: { [Op.in]: ids } } })).map(s.safeUser) : [];
    return { status: 200, profile: { ...s.safeUser(user), ...(profileId === currentUserId ? { email: user.email } : {}), followers: await users(followers.map(f => f.followerId)), followings: await users(following.map(f => f.followingId)), posts: posts.map(p => s.postJSON(p, currentUserId)), saved: (await Promise.all(saved.filter(x => x.post).map(async (x) => (await require('./accessService').canView(x.post, currentUserId)) ? s.postJSON(x.post, currentUserId) : null))).filter(Boolean) } };
};
exports.createFollow = async (userId, followingId) => {
    s.id(followingId);
    if (userId === followingId)
        throw s.error(400, 'You cannot follow yourself');
    if (!await User.findOne({ where: { id: followingId, disabled: false } }))
        throw s.error(404, 'User not found');
    const { created, notification } = await sequelize.transaction(async (transaction) => {
        const [, created] = await Follow.findOrCreate({ where: { followerId: userId, followingId }, transaction });
        if (created)
            await s.record(userId, 'FOLLOW', null, followingId, transaction);
        const notification = created ? await s.notify(userId, followingId, 'FOLLOW', null, transaction) : null;
        return { created, notification };
    });
    if (created) {
        s.emitNotification(followingId, notification);
        s.messageContactsChanged(userId, followingId);
    }
    return { status: 200, following: true };
};
exports.deleteFollow = async (userId, followingId) => {
    s.id(followingId);
    if (!await User.findOne({ where: { id: followingId, disabled: false } }))
        throw s.error(404, 'User not found');
    const removed = await sequelize.transaction(async transaction => {
        const count = await Follow.destroy({ where: { followerId: userId, followingId }, transaction });
        if (count) await s.record(userId, 'UNFOLLOW', null, followingId, transaction);
        return count;
    });
    if (removed) s.messageContactsChanged(userId, followingId);
    return { status: 200, following: false };
};

exports.updateProfile = async (userId, { avatarData, ...update }) => {
    const user = await User.findByPk(userId);
    if (!user) throw s.error(404, 'User not found');
    if (avatarData !== undefined) update.avatar = avatarData === null ? null : await require('./mediaService').prepareAvatar(avatarData);
    await user.update(update);
    return { status: 200, userInfo: { ...s.safeUser(user), email: user.email } };
};
