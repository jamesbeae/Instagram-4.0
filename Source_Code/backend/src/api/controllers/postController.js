const postService = require("../services/postService");

// create a Post:
exports.createPost = async (req, res, next) => {
    try {
        const { content, mediaUrl } = req.body;
        const result = await postService.createPost({
            content,
            mediaUrl,
            userId: req.currentUser.id,
        });
        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

exports.getFeed = async (req, res, next) => {
    try {
        const result = await postService.getFeed(req.validatedQuery);
        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

exports.getPostDetail = async (req, res, next) => {
    try {
        const result = await postService.getPostDetail(req.params.postId);
        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

exports.updatePost = async (req, res, next) => {
    try {
        const result = await postService.updatePost({
            postId: req.params.postId,
            userId: req.currentUser.id,
            ...req.body,
        });
        res.status(result.status).json(result);
    } catch (error) {
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
    } catch (error) {
        next(error);
    }
};
