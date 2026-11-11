const { Op } = require('sequelize');
const { User, Follow, Post, Save, sequelize } = require('../../database/models');
const s = require('./socialService');
exports.getAllUsers = async () => ({ status: 200, users: (await User.findAll({ where: { disabled: false }, attributes: ['id', 'username', 'fullName', 'bio', 'avatar'], order: [['username', 'ASC']], limit: 500 })).map(s.safeUser) });
exports.getSuggestedUsers = s.suggestedUsers;
exports.getUserProfile = async (profileId, currentUserId) => {
    const user = await User.findByPk(s.id(profileId));
    if (!user)
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
    if (!await User.findByPk(followingId))
        throw s.error(404, 'User not found');
    const created = await sequelize.transaction(async (transaction) => {
        const [, created] = await Follow.findOrCreate({ where: { followerId: userId, followingId }, transaction });
        if (created)
            await s.record(userId, 'FOLLOW', null, followingId, transaction);
        return created;
    });
    if (created)
        await s.notify(userId, followingId, 'FOLLOW');
    return { status: 200, following: true };
};
exports.deleteFollow = async (userId, followingId) => {
    s.id(followingId);
    await sequelize.transaction(async transaction => {
        const removed = await Follow.destroy({ where: { followerId: userId, followingId }, transaction });
        if (removed) await s.record(userId, 'UNFOLLOW', null, followingId, transaction);
    });
    return { status: 200, following: false };
};
