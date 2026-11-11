require('dotenv').config();
const jwt = require('jsonwebtoken');
const { User, Role } = require('../../database/models');
exports.verifyJWT = async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token)
        return res.status(401).json({ message: 'Authentication required' });
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_CODE);
    }
    catch {
        return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Invalid or expired access token' });
    }
    try {
        const user = await User.findByPk(decoded.userInfo?.id, { include: [{ model: Role, as: 'role' }] });
        if (!user || user.disabled || (decoded.userInfo.tokenVersion || 0) !== user.tokenVersion)
            return res.status(401).json({ message: 'Session revoked' });
        req.currentUser = { id: user.id, username: user.username, role: user.role?.name };
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.optionalJWT = (req, res, next) => req.headers.authorization ? exports.verifyJWT(req, res, next) : next();
exports.requireRole = (...roles) => (req, res, next) => roles.includes(req.currentUser?.role) ? next() : res.status(403).json({ message: 'Permission denied' });
