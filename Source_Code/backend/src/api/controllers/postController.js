const postService = require("../services/postService");
// create a Post:
exports.createPost = async (req, res, next) => {
    try {
        const content = req.body.content ?? req.body.caption;
        const { mediaUrl, photoVideoList, kind, visibility, groupId } = req.body;
        const result = await postService.createPost({
            content,
            mediaUrl,
            photoVideoList, kind, visibility, groupId,
            userId: req.currentUser.id,
        });
        res.status(result.status).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getFeed = async (req, res, next) => {
    try {
        const result = await postService.getFeed({ ...req.validatedQuery, currentUserId: req.currentUser?.id });
        res.status(result.status).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getPostDetail = async (req, res, next) => {
    try {
        const result = await postService.getPostDetail(req.params.postId, req.currentUser?.id);
        res.status(result.status).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deletePost = async (req, res, next) => {
    try {
        const result = await postService.deletePost({
            postId: req.params.postId,
            userId: req.currentUser.id,
        });
        res.status(result.status).json(result);
    }
    catch (error) {
        next(error);
    }
};
