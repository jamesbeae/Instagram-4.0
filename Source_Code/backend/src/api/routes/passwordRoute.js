const { Router } = require('express'), Joi = require('joi'), { Op } = require('sequelize'), { randomBytes, createHash } = require('crypto');
const { sequelize, User, PasswordReset } = require('../../database/models');
const s = require('../services/socialService');
const r = Router(), attempts = new Map();
const limited = (req, res, next) => {
    const now = Date.now(), key = req.ip + '|' + req.path, history = (attempts.get(key) || []).filter(t => now - t < 60000);
    if (history.length >= 5)
        return res.status(429).json({ message: 'Please wait a minute before trying again' });
    history.push(now);
    attempts.set(key, history);
    for (const [k, v] of attempts)
        if (v.every(t => now - t > 60000))
            attempts.delete(k);
    next();
};
const parse = (schema, data) => { const { value, error } = schema.validate(data); if (error)
    throw s.error(400, error.message); return value; };
const wrap = fn => async (req, res, next) => { try {
    res.json(await fn(req));
}
catch (e) {
    next(e);
} };
r.post('/auth/forgot-password', limited, wrap(async (req) => {
    const { email } = parse(Joi.object({ email: Joi.string().email().required() }), req.body);
    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
        throw s.error(503, 'Password recovery email is not configured. Contact the administrator.');
    const user = await User.findOne({ where: { email, disabled: false } });
    if (user) {
        const token = randomBytes(32).toString('hex'), tokenHash = createHash('sha256').update(token).digest('hex');
        const reset = await PasswordReset.create({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600000) });
        try {
            const frontend = (process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password');
            const link = frontend + '?token=' + token;
            const endpoint = process.env.NODE_ENV === 'test' && process.env.TEST_MAIL_ENDPOINT ? process.env.TEST_MAIL_ENDPOINT : 'https://api.resend.com/emails';
            const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: 'Reset your Instagram password', text: 'Reset your password within one hour: ' + link + '\nIf you did not request this, ignore this message.' }), signal: AbortSignal.timeout(10000) });
            if (!response.ok)
                throw new Error('Delivery failed');
        }
        catch {
            await reset.destroy();
            console.error('Password recovery email delivery failed');
        }
    }
    return { message: 'If this account exists, a recovery email has been sent.' };
}));
r.post('/auth/reset-password', limited, wrap(async (req) => {
    const { token, password } = parse(Joi.object({ token: Joi.string().hex().length(64).required(), password: Joi.string().min(8).max(128).required() }), req.body);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    let userId;
    await sequelize.transaction(async (transaction) => {
        const reset = await PasswordReset.findOne({ where: { tokenHash, expiresAt: { [Op.gt]: new Date() } }, transaction, lock: transaction.LOCK.UPDATE });
        if (!reset)
            throw s.error(400, 'Recovery link is invalid or expired');
        const user = await User.findByPk(reset.userId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user || user.disabled)
            throw s.error(400, 'Recovery link is invalid or expired');
        await user.update({ passwordHash: await require('bcryptjs').hash(password, 12), refreshToken: null, tokenVersion: user.tokenVersion + 1 }, { transaction });
        await PasswordReset.destroy({ where: { userId: user.id }, transaction });
        userId = user.id;
    });
    s.disconnectUser(userId);
    return { message: 'Password updated. Sign in with your new password.' };
}));
module.exports = r;
