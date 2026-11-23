const s = require('./socialService');
exports.createComment = (postId, userId, content, parentCommentId) => s.comment(userId, postId, content, parentCommentId);
exports.getComments = s.comments;
exports.likeComment = s.likeComment;
exports.unlikeComment = s.unlikeComment;
