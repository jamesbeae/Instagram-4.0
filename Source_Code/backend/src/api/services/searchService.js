const { Op, fn, col, where } = require('sequelize');
const { User, Post } = require('../../database/models');
const social = require('./socialService');
const access = require('./accessService');

exports.search = async (userId, { q, scope, page, limit }) => {
    // strpos treats all query characters literally; Sequelize escapes query values.
    const matches = field => where(fn('strpos', fn('lower', col(field)), q.toLowerCase()), { [Op.gt]: 0 });
    let users = [], posts = [], total = 0;
    if (scope === 'users') {
        const result = await User.findAndCountAll({
            where: { disabled: false, [Op.or]: [matches('username'), matches('full_name')] },
            attributes: ['id', 'username', 'fullName', 'avatar', 'bio'],
            order: [['username', 'ASC'], ['id', 'ASC']], limit, offset: (page - 1) * limit
        });
        users = result.rows.map(social.safeUser); total = result.count;
    } else {
        const result = await Post.findAndCountAll({
            where: { kind: 'POST', [Op.and]: [access.visibleWhere(userId), matches('Post.content')] },
            include: social.includes.map(item => item.as === 'user' ? { ...item, required: true, where: { disabled: false } } : item),
            distinct: true, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit
        });
        posts = result.rows.map(post => social.postJSON(post, userId)); total = result.count;
    }
    return { status: 200, users, postsList: posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
