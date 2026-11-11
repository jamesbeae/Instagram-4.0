const { Router } = require('express'), Joi = require('joi'), { Op } = require('sequelize');
const { sequelize, Group, GroupMember, User, Role, Post, Report, Interaction } = require('../../database/models');
const { verifyJWT, requireRole } = require('../middlewares/verifyJWT');
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
r.post('/groups', verifyJWT, wrap(async (req) => { const data = parse(Joi.object({ name: Joi.string().trim().min(1).max(100).required() }), req.body); return { status: 201, group: await Group.create({ ...data, ownerId: req.currentUser.id }) }; }));
r.post('/groups/:id/members', verifyJWT, wrap(async (req) => { const group = await ownedGroup(req); const { userId } = parse(Joi.object({ userId: Joi.string().uuid().required() }), req.body); if (!await User.findByPk(userId))
    throw s.error(404, 'User not found'); await GroupMember.findOrCreate({ where: { groupId: group.id, userId } }); return { status: 200 }; }));
r.delete('/groups/:id/members/:userId', verifyJWT, wrap(async (req) => { await ownedGroup(req); await GroupMember.destroy({ where: { groupId: req.params.id, userId: s.id(req.params.userId) } }); return { status: 200 }; }));
r.delete('/groups/:id', verifyJWT, wrap(async (req) => { const group = await ownedGroup(req); const count = await Post.count({ where: { groupId: group.id } }); if (count)
    throw s.error(409, 'This list has shared posts. Delete or change those posts before removing the list.'); await group.destroy(); return { status: 200 }; }));
r.get('/post/stories', verifyJWT, wrap(async (req) => ({ postsList: (await Post.findAll({ where: { kind: 'STORY', ...access.visibleWhere(req.currentUser.id) }, include: s.includes, order: [['createdAt', 'DESC']], limit: 100 })).map(p => s.postJSON(p, req.currentUser.id)) })));
r.get('/post/explore', verifyJWT, wrap(async (req) => { const { page, limit } = parse(require('../validations/postValidation').feedQuerySchema, req.query); const { count, rows } = await Post.findAndCountAll({ where: { kind: 'POST', ...access.visibleWhere(req.currentUser.id) }, include: s.includes, distinct: true, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit }); return { postsList: rows.map(p => s.postJSON(p, req.currentUser.id)), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } }; }));
r.get('/post/reels', verifyJWT, wrap(async (req) => { const { page, limit } = parse(require('../validations/postValidation').feedQuerySchema, req.query); const { count, rows } = await Post.findAndCountAll({ where: { kind: 'POST', media: { [Op.contains]: [{ type: 'VIDEO' }] }, ...access.visibleWhere(req.currentUser.id) }, include: s.includes, distinct: true, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit }); return { postsList: rows.map(p => s.postJSON(p, req.currentUser.id)), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } }; }));
r.post('/reports', verifyJWT, wrap(async (req) => { const data = parse(Joi.object({ postId: Joi.string().uuid(), targetUserId: Joi.string().uuid(), reason: Joi.string().trim().min(5).max(2000).required() }).xor('postId', 'targetUserId'), req.body); if (data.postId)
    await s.findPost(data.postId, req.currentUser.id);
else if (!await User.findByPk(data.targetUserId))
    throw s.error(404, 'User not found'); return { status: 201, report: await Report.create({ ...data, reporterId: req.currentUser.id }) }; }));
r.get('/creator/analytics', verifyJWT, requireRole('creator', 'admin'), wrap(async (req) => {
    const posts = await Post.findAll({ where: { userId: req.currentUser.id }, include: s.includes });
    const events = await Interaction.findAll({ where: { postId: { [Op.in]: posts.map(p => p.id) } } });
    return { posts: posts.map(p => ({ id: p.id, caption: p.content, likes: p.likes.length, comments: p.comments.length, saves: p.saves.length, views: events.filter(e => e.postId === p.id && e.type === 'VIEW').length, shares: events.filter(e => e.postId === p.id && e.type === 'SHARE').length })) };
}));
r.post('/user/become-creator', verifyJWT, wrap(async (req) => { if (req.currentUser.role === 'admin')
    return { status: 200 }; const role = await Role.findOne({ where: { name: 'creator' } }); if (!role)
    throw s.error(503, 'Creator role missing'); await User.update({ roleId: role.id }, { where: { id: req.currentUser.id } }); return { status: 200 }; }));
r.get('/admin/reports', verifyJWT, requireRole('admin'), wrap(async () => ({ reports: await Report.findAll({ order: [['createdAt', 'DESC']], limit: 200 }) })));
r.get('/admin/users', verifyJWT, requireRole('admin'), wrap(async () => ({ users: (await User.findAll({ include: [{ model: Role, as: 'role' }], limit: 200 })).map(u => ({ ...s.safeUser(u), disabled: u.disabled, role: u.role?.name })) })));
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
    await user.update(update);
    s.disconnectUser(user.id);
    return { status: 200 };
}));
r.patch('/admin/reports/:id', verifyJWT, requireRole('admin'), wrap(async (req) => {
    const { action } = parse(Joi.object({ action: Joi.string().valid('dismiss', 'hide-post', 'disable-user').required() }), req.body);
    const report = await Report.findByPk(s.id(req.params.id));
    if (!report)
        throw s.error(404, 'Report not found');
    await sequelize.transaction(async (transaction) => {
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
        }
        await report.update({ status: action }, { transaction });
    });
    if (action === 'disable-user')
        s.disconnectUser(report.targetUserId);
    return { status: 200 };
}));
module.exports = r;
