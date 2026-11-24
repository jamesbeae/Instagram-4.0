const { Router } = require('express'), Joi = require('joi'), { Op } = require('sequelize');
const { sequelize, Group, GroupMember, User, Role, Post, Report, Interaction, Follow, Like, Comment, Save, Message, AdminAction } = require('../../database/models');
const { verifyJWT, optionalJWT, requireRole } = require('../middlewares/verifyJWT');
const s = require('../services/socialService'), access = require('../services/accessService');
const r = Router(), wrap = fn => async (req, res, next) => { try {
    const result = await fn(req);
    res.status(result.status || 200).json(result);
}
catch (e) {
    next(e);
} };
const parse = (schema, data) => { const { value, error } = schema.validate(data); if (error)
    throw s.error(400, error.message); return value; };
const ownedGroup = async (req) => { const group = await Group.findByPk(s.id(req.params.id)); if (!group || group.ownerId !== req.currentUser.id)
    throw s.error(404, 'List not found'); return group; };
r.get('/groups', verifyJWT, wrap(async (req) => ({ groups: await Group.findAll({ where: { ownerId: req.currentUser.id }, include: [{ model: GroupMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'username', 'fullName', 'avatar'] }] }] }) })));
r.get('/groups/eligible-members', verifyJWT, wrap(async (req) => {
    const follows = await Follow.findAll({ where: { followerId: req.currentUser.id }, attributes: ['followingId'] });
    const ids = follows.map(follow => follow.followingId).filter(id => id !== req.currentUser.id);
    const users = await User.findAll({ where: { id: { [Op.in]: ids }, disabled: false }, attributes: ['id', 'username', 'fullName', 'avatar'], order: [['username', 'ASC']] });
    return { users: users.map(user => ({ ...user.get({ plain: true }), _id: user.id })) };
}));
r.post('/groups', verifyJWT, wrap(async (req) => { const data = parse(Joi.object({ name: Joi.string().trim().min(1).max(100).required() }), req.body); return { status: 201, group: await Group.create({ ...data, ownerId: req.currentUser.id }) }; }));
r.patch('/groups/:id', verifyJWT, wrap(async (req) => { const group = await ownedGroup(req); const { name } = parse(Joi.object({ name: Joi.string().trim().min(1).max(100).required() }), req.body); await group.update({ name }); return { status: 200, group }; }));
r.post('/groups/:id/members', verifyJWT, wrap(async (req) => {
    const group = await ownedGroup(req);
    const { userId } = parse(Joi.object({ userId: Joi.string().uuid().required() }), req.body);
    if (!await User.findOne({ where: { id: userId, disabled: false } })) throw s.error(404, 'User not found');
    if (userId === req.currentUser.id) throw s.error(400, 'You cannot add yourself to a relation list');
    await sequelize.transaction(async transaction => {
        const follow = await Follow.findOne({ where: { followerId: req.currentUser.id, followingId: userId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!follow) throw s.error(400, 'Group members must be accounts you follow');
        await GroupMember.findOrCreate({ where: { groupId: group.id, userId }, transaction });
    });
    return { status: 200 };
}));
r.delete('/groups/:id/members/:userId', verifyJWT, wrap(async (req) => { await ownedGroup(req); await GroupMember.destroy({ where: { groupId: req.params.id, userId: s.id(req.params.userId) } }); return { status: 200 }; }));
r.delete('/groups/:id', verifyJWT, wrap(async (req) => { const group = await ownedGroup(req); const count = await Post.count({ where: { groupId: group.id } }); if (count)
    throw s.error(409, 'This list has shared posts. Delete or change those posts before removing the list.'); await group.destroy(); return { status: 200 }; }));
r.get('/post/stories', optionalJWT, wrap(async (req) => ({ postsList: (await Post.findAll({ where: { kind: 'STORY', ...access.visibleWhere(req.currentUser?.id) }, include: s.includes, order: [['createdAt', 'DESC']], limit: 100 })).map(p => s.postJSON(p, req.currentUser?.id)) })));
r.get('/post/explore', optionalJWT, wrap(async (req) => { const { page, limit } = parse(require('../validations/postValidation').feedQuerySchema, req.query); const { count, rows } = await Post.findAndCountAll({ where: { kind: 'POST', ...access.visibleWhere(req.currentUser?.id) }, include: s.includes, distinct: true, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit }); return { postsList: rows.map(p => s.postJSON(p, req.currentUser?.id)), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } }; }));
r.get('/post/reels', optionalJWT, wrap(async (req) => { const { page, limit } = parse(require('../validations/postValidation').feedQuerySchema, req.query); const { count, rows } = await Post.findAndCountAll({ where: { [Op.and]: [{ [Op.or]: [{ kind: 'REEL' }, { kind: 'POST', media: { [Op.contains]: [{ type: 'VIDEO' }] } }] }, access.visibleWhere(req.currentUser?.id)] }, include: s.includes, distinct: true, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit }); return { postsList: rows.map(p => s.postJSON(p, req.currentUser?.id)), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } }; }));
r.post('/reports', verifyJWT, wrap(async (req) => { const data = parse(Joi.object({ postId: Joi.string().uuid(), targetUserId: Joi.string().uuid(), reason: Joi.string().trim().min(5).max(2000).required() }).xor('postId', 'targetUserId'), req.body); if (data.postId)
    await s.findPost(data.postId, req.currentUser.id);
else if (data.targetUserId === req.currentUser.id)
    throw s.error(400, 'You cannot report your own account'); else if (!await User.findByPk(data.targetUserId))
    throw s.error(404, 'User not found');
    const subject = data.postId ? { postId: data.postId } : { targetUserId: data.targetUserId };
    const existing = await Report.findOne({ where: { reporterId: req.currentUser.id, status: 'open', ...subject } });
    if (existing) return { status: 200, duplicate: true, report: existing };
    try { return { status: 201, report: await Report.create({ ...data, reporterId: req.currentUser.id }) }; }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const duplicate = await Report.findOne({ where: { reporterId: req.currentUser.id, status: 'open', ...subject } });
            if (duplicate) return { status: 200, duplicate: true, report: duplicate };
        }
        throw error;
    }
}));
r.get('/creator/analytics', verifyJWT, requireRole('creator', 'admin'), wrap(async (req) => {
    const query = parse(Joi.object({ from: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/), to: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/), postId: Joi.string().uuid() }), req.query);
    const validDate = value => !value || (!Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value);
    if (!validDate(query.from) || !validDate(query.to) || (query.from && query.to && query.from > query.to)) throw s.error(400, 'Choose a valid date range');
    const allPosts = await Post.findAll({ where: { userId: req.currentUser.id, kind: 'POST' }, attributes: ['id', 'content', 'createdAt'], order: [['createdAt', 'DESC']] });
    const availablePosts = allPosts.map(p => ({ id: p.id, caption: p.content, createdAt: p.createdAt }));
    const postWhere = { userId: req.currentUser.id, kind: 'POST' };
    if (query.postId) postWhere.id = query.postId;
    if (query.from || query.to) postWhere.createdAt = { ...(query.from ? { [Op.gte]: new Date(`${query.from}T00:00:00.000Z`) } : {}), ...(query.to ? { [Op.lt]: new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86400000) } : {}) };
    const posts = await Post.findAll({ where: postWhere, include: s.includes, order: [['createdAt', 'DESC']] });
    const ids = posts.map(p => p.id);
    const eventWhere = { postId: { [Op.in]: ids } };
    if (query.from || query.to) eventWhere.createdAt = { ...(query.from ? { [Op.gte]: new Date(`${query.from}T00:00:00.000Z`) } : {}), ...(query.to ? { [Op.lt]: new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86400000) } : {}) };
    const [events, likes, comments, saves] = await Promise.all([
        Interaction.findAll({ where: eventWhere, attributes: ['postId', 'type'] }),
        Like.findAll({ where: { postId: { [Op.in]: ids }, ...(eventWhere.createdAt ? { createdAt: eventWhere.createdAt } : {}) }, attributes: ['postId'] }),
        Comment.findAll({ where: { postId: { [Op.in]: ids }, ...(eventWhere.createdAt ? { createdAt: eventWhere.createdAt } : {}) }, attributes: ['postId'] }),
        Save.findAll({ where: { postId: { [Op.in]: ids }, ...(eventWhere.createdAt ? { createdAt: eventWhere.createdAt } : {}) }, attributes: ['postId'] })
    ]);
    const countFor = (items, postId) => items.filter(item => item.postId === postId).length;
    return { posts: posts.map(p => ({ id: p.id, caption: p.content, likes: countFor(likes, p.id), comments: countFor(comments, p.id), saves: countFor(saves, p.id), views: events.filter(e => e.postId === p.id && e.type === 'VIEW').length, shares: events.filter(e => e.postId === p.id && e.type === 'SHARE').length })), availablePosts };
}));
r.post('/user/become-creator', verifyJWT, wrap(async (req) => { if (req.currentUser.role === 'admin')
    return { status: 200 }; const role = await Role.findOne({ where: { name: 'creator' } }); if (!role)
    throw s.error(503, 'Creator role missing'); await User.update({ roleId: role.id }, { where: { id: req.currentUser.id } }); return { status: 200 }; }));
r.get('/admin/reports', verifyJWT, requireRole('admin'), wrap(async () => ({ reports: await Report.findAll({ order: [['createdAt', 'DESC']], limit: 200 }) })));
r.get('/admin/content', verifyJWT, requireRole('admin'), wrap(async (req) => {
    const query = parse(Joi.object({ q: Joi.string().trim().max(120).allow(''), kind: Joi.string().valid('all', 'POST', 'STORY', 'REEL').default('all'), status: Joi.string().valid('all', 'visible', 'hidden').default('all'), page: Joi.number().integer().min(1).max(10000).default(1), limit: Joi.number().integer().min(1).max(100).default(50) }), req.query);
    const where = {};
    if (query.kind !== 'all') where.kind = query.kind;
    if (query.status === 'visible') where.hidden = false;
    if (query.status === 'hidden') where.hidden = true;
    if (query.q) where[Op.or] = [{ content: { [Op.iLike]: `%${query.q.replace(/[\\%_]/g, '\\$&')}%` } }, ...(Joi.string().uuid().validate(query.q).error ? [] : [{ id: query.q }])];
    const { count, rows } = await Post.findAndCountAll({ where, include: s.includes, distinct: true, order: [['createdAt', 'DESC']], limit: query.limit, offset: (query.page - 1) * query.limit });
    return { postsList: rows.map(post => ({ ...s.postJSON(post), hidden: post.hidden })), pagination: { page: query.page, limit: query.limit, total: count, totalPages: Math.ceil(count / query.limit) } };
}));
r.patch('/admin/content/:id/moderate', verifyJWT, requireRole('admin'), wrap(async (req) => {
    const { action, resolution } = parse(Joi.object({ action: Joi.string().valid('keep', 'hide').required(), resolution: Joi.string().trim().min(5).max(1000).required() }), req.body);
    await sequelize.transaction(async transaction => {
        const post = await Post.findByPk(s.id(req.params.id), { transaction, lock: transaction.LOCK.UPDATE });
        if (!post) throw s.error(404, 'Content not found');
        const hidden = action === 'hide';
        if (post.hidden === hidden) throw s.error(409, `Content is already ${hidden ? 'hidden' : 'visible'}`);
        await post.update({ hidden }, { transaction });
        await AdminAction.create({ adminId: req.currentUser.id, targetUserId: post.userId, action: 'MODERATE_CONTENT', details: { decision: action, resolution, postId: post.id, kind: post.kind } }, { transaction });
    });
    return { status: 200 };
}));
r.get('/admin/users', verifyJWT, requireRole('admin'), wrap(async () => ({ users: (await User.findAll({ include: [{ model: Role, as: 'role' }], limit: 200 })).map(u => ({ ...s.safeUser(u), disabled: u.disabled, role: u.role?.name })) })));
r.get('/admin/stats', verifyJWT, requireRole('admin'), wrap(async (req) => {
    const query = parse(Joi.object({ from: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/), to: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/), category: Joi.string().valid('all', 'accounts', 'content', 'interactions', 'reports').default('all') }), req.query);
    const validDate = value => !value || (!Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value);
    if (!validDate(query.from) || !validDate(query.to) || (query.from && query.to && query.from > query.to)) throw s.error(400, 'Choose a valid date range');
    const createdAt = { ...(query.from ? { [Op.gte]: new Date(`${query.from}T00:00:00.000Z`) } : {}), ...(query.to ? { [Op.lt]: new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86400000) } : {}) };
    const range = query.from || query.to ? { createdAt } : {};
    const [users, activeUsers, disabledUsers, posts, stories, reels, openReports, resolvedReports, follows, likes, comments, saves, messages, behaviorEvents] = await Promise.all([
        User.count({ where: range }), User.count({ where: { ...range, disabled: false } }), User.count({ where: { ...range, disabled: true } }),
        Post.count({ where: { ...range, kind: 'POST', hidden: false } }), Post.count({ where: { ...range, kind: 'STORY', hidden: false } }), Post.count({ where: { ...range, hidden: false, [Op.or]: [{ kind: 'REEL' }, { kind: 'POST', media: { [Op.contains]: [{ type: 'VIDEO' }] } }] } }),
        Report.count({ where: { ...range, status: 'open' } }), Report.count({ where: { ...range, status: { [Op.ne]: 'open' } } }),
        Follow.count({ where: range }), Like.count({ where: range }), Comment.count({ where: range }), Save.count({ where: range }), Message.count({ where: range }), Interaction.count({ where: range })
    ]);
    return { category: query.category, from: query.from || null, to: query.to || null, users, activeUsers, disabledUsers, posts, stories, reels, openReports, resolvedReports, follows, likes, comments, saves, messages, behaviorEvents };
}));
r.get('/admin/actions', verifyJWT, requireRole('admin'), wrap(async () => ({ actions: await AdminAction.findAll({ include: [{ model: User, as: 'admin', attributes: ['id', 'username'] }, { model: User, as: 'targetUser', attributes: ['id', 'username'] }], order: [['createdAt', 'DESC']], limit: 100 }) })));
r.patch('/admin/users/:id', verifyJWT, requireRole('admin'), wrap(async (req) => {
    const data = parse(Joi.object({ disabled: Joi.boolean(), role: Joi.string().valid('user', 'creator', 'admin') }).min(1), req.body);
    const user = await User.findByPk(s.id(req.params.id));
    if (!user)
        throw s.error(404, 'User not found');
    if (user.id === req.currentUser.id)
        throw s.error(400, 'Cannot alter your own administrator access');
    const update = { tokenVersion: user.tokenVersion + 1, refreshToken: null };
    if (data.disabled !== undefined)
        update.disabled = data.disabled;
    if (data.role) {
        const role = await Role.findOne({ where: { name: data.role } });
        update.roleId = role.id;
    }
    await sequelize.transaction(async transaction => {
        await user.update(update, { transaction });
        await AdminAction.create({ adminId: req.currentUser.id, targetUserId: user.id, action: 'UPDATE_USER', details: data }, { transaction });
    });
    s.disconnectUser(user.id);
    return { status: 200 };
}));
r.patch('/admin/reports/:id', verifyJWT, requireRole('admin'), wrap(async (req) => {
    const { action, resolution } = parse(Joi.object({ action: Joi.string().valid('dismiss', 'hide-post', 'disable-user').required(), resolution: Joi.string().trim().min(5).max(1000).required() }), req.body);
    let disconnectTargetUserId;
    let notification;
    await sequelize.transaction(async (transaction) => {
        const report = await Report.findByPk(s.id(req.params.id), { transaction, lock: transaction.LOCK.UPDATE });
        if (!report) throw s.error(404, 'Report not found');
        if (report.status !== 'open') throw s.error(409, 'This report has already been resolved');
        if (action === 'hide-post') {
            if (!report.postId)
                throw s.error(400, 'Report has no post');
            await Post.update({ hidden: true }, { where: { id: report.postId }, transaction });
        }
        if (action === 'disable-user') {
            if (!report.targetUserId || report.targetUserId === req.currentUser.id)
                throw s.error(400, 'Invalid target account');
            const user = await User.findByPk(report.targetUserId, { transaction });
            await user.update({ disabled: true, tokenVersion: user.tokenVersion + 1, refreshToken: null }, { transaction });
            disconnectTargetUserId = user.id;
        }
        await report.update({ status: action }, { transaction });
        await AdminAction.create({ adminId: req.currentUser.id, reportId: report.id, targetUserId: report.targetUserId, action: 'RESOLVE_REPORT', details: { decision: action, resolution, postId: report.postId } }, { transaction });
        const savedNotification = await Notification.create({ senderId: req.currentUser.id, receiverId: report.reporterId, type: 'REPORT_RESOLVED', postId: report.postId, content: `Your report was reviewed: ${resolution}` }, { transaction });
        notification = { ...savedNotification.get({ plain: true }), _id: savedNotification.id, sender: s.safeUser(req.currentUser) };
    });
    if (disconnectTargetUserId)
        s.disconnectUser(disconnectTargetUserId);
    s.emitNotification(notification.receiverId, notification);
    return { status: 200 };
}));
module.exports = r;
