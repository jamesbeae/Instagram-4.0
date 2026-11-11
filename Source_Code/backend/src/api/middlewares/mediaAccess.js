const jwt = require('jsonwebtoken'), { Op } = require('sequelize');
const { Post, User } = require('../../database/models');
const access = require('../services/accessService');
// Local media follows post visibility. Public uploads remain readable without a login.
module.exports = async (req, res, next) => {
    try {
        const filename = req.path.slice(1);
        if (!/^[0-9a-f-]+\.(jpg|png|webp|gif|mp4|webm)$/.test(filename))
            return res.sendStatus(404);
        const posts = await Post.findAll({ where: { [Op.or]: [{ media: { [Op.contains]: [{ localFile: filename }] } }, { media: { [Op.contains]: [{ assetId: filename }] } }] } });
        if (!posts.length)
            return res.sendStatus(404);
        let userId;
        const token = req.headers.authorization?.split(' ')[1];
        try {
            if (token) {
                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_CODE);
                const user = await User.findByPk(decoded.userInfo.id);
                if (user && !user.disabled && user.tokenVersion === (decoded.userInfo.tokenVersion || 0))
                    userId = user.id;
            }
            else if (req.cookies.jwt) {
                const decoded = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_CODE);
                const user = await User.findOne({ where: { id: decoded.userInfo.id, refreshToken: req.cookies.jwt, disabled: false } });
                if (user)
                    userId = user.id;
            }
        }
        catch { }
        for (const post of posts)
            if (await access.canView(post, userId)) {
                req.mediaAsset = post.media.find(m => m.localFile === filename || m.assetId === filename);
                return next();
            }
        return res.sendStatus(404);
    }
    catch (e) {
        next(e);
    }
};
