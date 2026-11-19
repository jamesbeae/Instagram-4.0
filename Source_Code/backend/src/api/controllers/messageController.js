const social = require('../services/socialService');

exports.getInbox = async (req, res, next) => {
    try {
        res.json(await social.messageInbox(req.currentUser.id));
    } catch (error) {
        next(error);
    }
};

exports.markRead = async (req, res, next) => {
    try {
        await social.markMessagesRead(req.currentUser.id, req.body?.messageId);
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
};

exports.getMessages = async (req, res, next) => {
    try {
        const Joi = require('joi');
        const s = require('../services/socialService');
        if (req.query.sender_id && req.query.sender_id !== req.currentUser.id)
            throw s.error(403, 'You may only read your own conversations');
        const { value, error } = Joi.object({ page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(100).default(50) }).validate({ page: req.query.page, limit: req.query.limit });
        if (error)
            throw s.error(400, error.message);
        res.json(await s.getMessages(req.currentUser.id, req.query.receiver_id, value));
    }
    catch (e) {
        next(e);
    }
};
