const s = require('./socialService');
exports.createComment = (postId, userId, content) => s.comment(userId, postId, content);
exports.getComments = s.comments;
