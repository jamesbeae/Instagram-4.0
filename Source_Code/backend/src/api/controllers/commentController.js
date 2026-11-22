const commentService = require("../services/commentService");
// Create Comment:
exports.createComment = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser.id;
        const { postId, parentCommentId, content } = req.body;
        const result = await commentService.createComment(postId, currentUserId, content, parentCommentId);
        return res.status(result.status).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.likeComment = async (req, res, next) => {
    try { const result = await commentService.likeComment(req.currentUser.id, req.params.commentId); return res.status(result.status).json(result); }
    catch (error) { next(error); }
};
exports.unlikeComment = async (req, res, next) => {
    try { const result = await commentService.unlikeComment(req.currentUser.id, req.params.commentId); return res.status(result.status).json(result); }
    catch (error) { next(error); }
};
exports.getComments = async (req, res, next) => {
    try {
        const { postId } = req.query;
        const result = await commentService.getComments(postId, req.currentUser?.id);
        return res.status(result.status).json(result);
    }
    catch (error) {
        next(error);
    }
};
