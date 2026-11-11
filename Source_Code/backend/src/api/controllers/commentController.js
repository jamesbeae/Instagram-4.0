const commentService = require("../services/commentService");
// Create Comment:
exports.createComment = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser.id;
        const { postId, content } = req.body;
        const result = await commentService.createComment(postId, currentUserId, content);
        return res.status(result.status).json(result);
    }
    catch (error) {
        next(error);
    }
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
