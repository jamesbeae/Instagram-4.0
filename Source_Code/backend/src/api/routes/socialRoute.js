const { Router } = require('express'), Joi = require('joi');
const { verifyJWT, optionalJWT } = require('../middlewares/verifyJWT');
const { User, Post, Interaction, Notification } = require('../../database/models');
const s = require('../services/socialService');
const wrap = fn => async (req, res, next) => { try {
    const data = await fn(req);
    res.status(data.status || 200).json(data);
}
catch (e) {
    next(e);
} };
const validated = (schema, data) => { const { value, error } = schema.validate(data); if (error)
    throw s.error(400, error.message); return value; };
const router = Router();
router.get('/search', optionalJWT, wrap(req => require('../services/searchService').search(req.currentUser?.id,
    validated(Joi.object({ q: Joi.string().trim().min(1).max(120).required(), scope: Joi.string().valid('users', 'posts').default('users'), page: Joi.number().integer().min(1).max(10000).default(1), limit: Joi.number().integer().min(1).max(20).default(10) }), req.query))));
router.get('/post/recommended', verifyJWT, wrap(req => require('../services/recommendationService').getRecommended(req.currentUser.id, validated(require('../validations/postValidation').feedQuerySchema, req.query))));
router.post('/post/:postId/save', verifyJWT, wrap(req => s.save(req.currentUser.id, req.params.postId, true)));
router.delete('/post/:postId/save', verifyJWT, wrap(req => s.save(req.currentUser.id, req.params.postId, false)));
router.post('/post/:postId/interaction', verifyJWT, wrap(async (req) => {
    const { type } = validated(Joi.object({ type: Joi.string().valid('VIEW', 'SHARE').required() }), req.body);
    await s.findPost(req.params.postId, req.currentUser.id);
    // Reloads and scrolling must not inflate view history within a ten-minute window.
    const { Op } = require('sequelize');
    const where = { userId: req.currentUser.id, postId: req.params.postId, type };
    if (type !== 'VIEW' || !await Interaction.findOne({ where: { ...where, createdAt: { [Op.gte]: new Date(Date.now() - 600000) } } }))
        await s.record(req.currentUser.id, type, req.params.postId);
    return { status: 201 };
}));
router.patch('/post/:postId', verifyJWT, wrap(req => {
    const data = validated(Joi.object({ content: Joi.string().trim().min(1).max(2200), mediaUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048) }).min(1), req.body);
    return require('../services/postService').updatePost({ postId: req.params.postId, userId: req.currentUser.id, ...data });
}));
const updateProfile = wrap(async req => {
    const data = validated(Joi.object({ fullName: Joi.string().trim().min(1).max(120), bio: Joi.string().max(2000).allow(''), avatar: Joi.string().uri({ scheme: ['http', 'https'] }).allow(null, ''), avatarData: Joi.string().pattern(/^data:image\/(png|jpeg|webp);base64,/).max(7000000).allow(null) }).oxor('avatar', 'avatarData').min(1), req.body);
    const result = await require('../services/userService').updateProfile(req.currentUser.id, data);
    return { ...result, userInfo: { ...result.userInfo, role: req.currentUser.role } };
});
router.patch('/user/me', verifyJWT, updateProfile);
router.post('/auth/change-password', verifyJWT, wrap(async (req) => {
    const data = validated(Joi.object({ currentPassword: Joi.string().required(), newPassword: Joi.string().min(8).max(128).required() }), req.body);
    const bcrypt = require('bcryptjs'), user = await User.findByPk(req.currentUser.id);
    if (!user.passwordHash || !await bcrypt.compare(data.currentPassword, user.passwordHash))
        throw s.error(403, 'Current password is incorrect');
    await user.update({ passwordHash: await bcrypt.hash(data.newPassword, 12), refreshToken: null, tokenVersion: user.tokenVersion + 1 });
    s.disconnectUser(user.id);
    return { status: 200, message: 'Password changed. Sign in again to renew your session.' };
}));
router.patch('/notification/:id/read', verifyJWT, wrap(async (req) => { await Notification.update({ read: true }, { where: { id: s.id(req.params.id), receiverId: req.currentUser.id } }); return { status: 200 }; }));
router.get('/user/activity', verifyJWT, wrap(async (req) => ({ status: 200, activity: await Interaction.findAll({ where: { userId: req.currentUser.id }, order: [['createdAt', 'DESC']], limit: 100 }) })));
module.exports = router;
