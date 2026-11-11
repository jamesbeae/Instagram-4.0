const { Op } = require('sequelize');
const { Post, Follow, Interaction } = require('../../database/models');
const social = require('./socialService');
const config = require('../../config/recommendation-weights.json');
const weights = exports.weights = { VIEW: 1, LIKE: 3, COMMENT: 4, SAVE: 5, SHARE: 3, FOLLOW: 4 };
const terms = text => new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(t => !['the', 'and', 'this', 'with', 'your', 'from', 'that'].includes(t)));
// A deterministic, explainable hybrid baseline. No external user identities are mixed into the live database.
exports.rank = (posts, events, followed, userId, now = Date.now()) => {
    const byId = new Map(posts.map(p => [p.id, p]));
    const author = new Map(), interests = new Map();
    for (const event of events) {
        const post = byId.get(event.postId), weight = (weights[event.type] || 0) * Math.exp(-Math.max(0, now - new Date(event.createdAt)) / 86400000 / 30);
        if (post) {
            author.set(post.userId, (author.get(post.userId) || 0) + weight);
            for (const t of terms(post.content))
                interests.set(t, (interests.get(t) || 0) + weight);
        }
        if (event.type === 'FOLLOW' && event.targetUserId)
            author.set(event.targetUserId, (author.get(event.targetUserId) || 0) + weight);
    }
    const maxInterest = Math.max(1, ...interests.values());
    return posts.map(p => {
        const topic = [...terms(p.content)].reduce((sum, t) => sum + (interests.get(t) || 0) / maxInterest, 0) / Math.max(1, terms(p.content).size);
        const age = Math.max(0, now - new Date(p.createdAt)) / 86400000;
        const score = 2 * (followed.has(p.userId) ? 1 : 0) + config.authorAffinityWeight * Math.log1p(author.get(p.userId) || 0) + 2 * topic + Math.log1p((p.likes || []).length + 2 * (p.comments || []).length) * 0.3 + Math.exp(-age / 7) - (p.userId === userId ? 0.5 : 0);
        return { post: p, score, reason: followed.has(p.userId) ? 'From someone you follow' : topic > 0 ? 'Based on your interests' : 'Popular or recent content' };
    }).sort((a, b) => b.score - a.score || String(a.post.id).localeCompare(String(b.post.id)));
};
exports.getRecommended = async (userId, { page = 1, limit = 10 }) => {
    const models = await Post.findAll({ where: { ...require("./accessService").visibleWhere(userId), kind: "POST" }, include: social.includes, order: [['createdAt', 'DESC']], limit: 1000 });
    const posts = models.map(p => p.get({ plain: true }));
    const events = (await Interaction.findAll({ where: { userId, createdAt: { [Op.gte]: new Date(Date.now() - 90 * 86400000) } }, order: [['createdAt', 'DESC']], limit: 5000 })).map(e => e.get({ plain: true }));
    const followed = new Set((await Follow.findAll({ where: { followerId: userId } })).map(f => f.followingId));
    const ranked = exports.rank(posts, events, followed, userId);
    return { status: 200, postsList: ranked.slice((page - 1) * limit, page * limit).map(r => ({ ...social.postJSON(r.post, userId), recommendation: { score: r.score, reason: r.reason } })), pagination: { page, limit, total: ranked.length, totalPages: Math.ceil(ranked.length / limit) }, algorithm: 'hybrid-baseline-v1' };
};
