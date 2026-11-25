const { Op } = require('sequelize');
const { User, Role, Follow, Post, Save, Group, GroupMember, sequelize } = require('../../database/models');
const s = require('./socialService');
exports.getAllUsers = async () => ({ status: 200, users: (await User.findAll({ where: { disabled: false }, attributes: ['id', 'username', 'fullName', 'bio', 'avatar'], order: [['username', 'ASC']], limit: 500 })).map(s.safeUser) });
exports.getSuggestedUsers = s.suggestedUsers;
exports.getUserProfile = async (profileId, currentUserId) => {
    const user = await User.findByPk(s.id(profileId));
    if (!user || user.disabled)
        throw s.error(404, 'User not found');
    const [followers, following, posts, reels, saved] = await Promise.all([
        Follow.findAll({ where: { followingId: profileId } }), Follow.findAll({ where: { followerId: profileId } }),
        Post.findAll({ where: { userId: profileId, kind: 'POST', ...require('./accessService').visibleWhere(currentUserId) }, include: s.includes, order: [['createdAt', 'DESC']] }),
        Post.findAll({ where: { userId: profileId, kind: 'REEL', ...require('./accessService').visibleWhere(currentUserId) }, include: s.includes, order: [['createdAt', 'DESC']] }),
        profileId === currentUserId ? Save.findAll({ where: { userId: profileId }, include: [{ model: Post, as: 'post', include: s.includes }], order: [['createdAt', 'DESC']] }) : []
    ]);
    const users = async (ids) => ids.length ? (await User.findAll({ where: { id: { [Op.in]: ids }, disabled: false } })).map(s.safeUser) : [];
    return { status: 200, profile: { ...s.safeUser(user), ...(profileId === currentUserId ? { email: user.email } : {}), followers: await users(followers.map(f => f.followerId)), followings: await users(following.map(f => f.followingId)), posts: posts.map(p => s.postJSON(p, currentUserId)), reels: reels.map(p => s.postJSON(p, currentUserId)), saved: (await Promise.all(saved.filter(x => x.post).map(async (x) => (await require('./accessService').canView(x.post, currentUserId)) ? s.postJSON(x.post, currentUserId) : null))).filter(Boolean) } };
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
    if (created) s.emitNotification(followingId, notification);
    return { status: 200, following: true };
};
exports.deleteFollow = async (userId, followingId) => {
    s.id(followingId);
    if (!await User.findOne({ where: { id: followingId, disabled: false } }))
        throw s.error(404, 'User not found');
    await sequelize.transaction(async transaction => {
        const count = await Follow.destroy({ where: { followerId: userId, followingId }, transaction });
        if (count) {
            await s.record(userId, 'UNFOLLOW', null, followingId, transaction);
            const groups = await Group.findAll({ where: { ownerId: userId }, attributes: ['id'], transaction });
            if (groups.length) await GroupMember.destroy({ where: { userId: followingId, groupId: { [Op.in]: groups.map(group => group.id) } }, transaction });
        }
    });
    return { status: 200, following: false };
};

exports.updateProfile = async (userId, { avatarData, ...update }) => {
    const user = await User.findByPk(userId, { include: [{ model: Role, as: 'role' }] });
    if (!user) throw s.error(404, 'User not found');
    if (update.username !== undefined && await User.findOne({ where: { [Op.and]: [sequelize.where(sequelize.fn('lower', sequelize.col('username')), update.username.toLowerCase()), { id: { [Op.ne]: userId } }] } })) throw s.error(409, 'username');
    if (update.email !== undefined) {
        update.email = update.email.trim().toLowerCase();
        if (await User.findOne({ where: { [Op.and]: [sequelize.where(sequelize.fn('lower', sequelize.col('email')), update.email), { id: { [Op.ne]: userId } }] } })) throw s.error(409, 'email');
    }
    if (avatarData !== undefined) update.avatar = avatarData === null ? null : await require('./mediaService').prepareAvatar(avatarData);
    try { await user.update(update); }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') throw s.error(409, error.errors?.[0]?.path || 'username');
        throw error;
    }
    return { status: 200, userInfo: { ...s.safeUser(user), email: user.email, role: user.role ? { id: user.role.id, name: user.role.name } : null } };
};
