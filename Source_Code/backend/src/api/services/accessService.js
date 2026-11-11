const { Op, literal } = require('sequelize');
const { sequelize, Follow, GroupMember } = require('../../database/models');
const { error, id } = require('./socialService');
exports.visibleWhere = (userId) => {
    const scope = [{ visibility: 'public' }];
    if (userId) {
        const uid = sequelize.escape(id(userId));
        scope.push({ userId });
        scope.push({ [Op.and]: [{ visibility: 'followers' }, literal('EXISTS (SELECT 1 FROM follows f WHERE f.following_id="Post"."user_id" AND f.follower_id=' + uid + ')')] });
        scope.push({ [Op.and]: [{ visibility: 'group' }, literal('EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id="Post"."group_id" AND gm.user_id=' + uid + ')')] });
    }
    return { [Op.and]: [{ [Op.or]: scope }, { hidden: false }, { [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }] }] };
};
exports.canView = async (post, userId) => {
    if (post.hidden || post.expiresAt && post.expiresAt <= new Date())
        return false;
    if (post.visibility === 'public' || post.userId === userId)
        return true;
    if (!userId)
        return false;
    if (post.visibility === 'followers')
        return !!await Follow.findOne({ where: { followerId: userId, followingId: post.userId } });
    return !!await GroupMember.findOne({ where: { userId, groupId: post.groupId } });
};
exports.assertView = async (post, userId) => { if (!await exports.canView(post, userId))
    throw error(404, 'Post not found'); };
