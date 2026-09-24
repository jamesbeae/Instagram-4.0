const { StatusCodes } = require("http-status-codes");
const postQuery = require("../sequelizeQuery/postSequelize");

const httpError = (status, message) =>
    Object.assign(new Error(message), { status });

const serializePost = (post) => {
    const data = post.get({ plain: true });
    return { ...data, _id: data.id };
};

exports.createPost = async ({ content, mediaUrl, userId }) => {
    const createdPost = await postQuery.createPost({
        content,
        mediaUrl,
        userId,
    });
    const post = await postQuery.findPostById(createdPost.id);

    return {
        status: StatusCodes.CREATED,
        message: "Post created successfully",
        post: serializePost(post),
    };
};

exports.getFeed = async ({ page, limit }) => {
    const offset = (page - 1) * limit;
    const { count, rows } = await postQuery.getFeed({ limit, offset });

    return {
        status: StatusCodes.OK,
        message: "Feed retrieved successfully",
        postsList: rows.map(serializePost),
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
        },
    };
};

exports.getPostDetail = async (postId) => {
    const post = await postQuery.findPostById(postId);
    if (!post) {
        throw httpError(StatusCodes.NOT_FOUND, "Post not found");
    }

    return {
        status: StatusCodes.OK,
        message: "Post retrieved successfully",
        post: serializePost(post),
    };
};

exports.deletePost = async ({ postId, userId }) => {
    const post = await postQuery.findPostById(postId);
    if (!post) {
        throw httpError(StatusCodes.NOT_FOUND, "Post not found");
    }
    if (post.userId !== userId) {
        throw httpError(
            StatusCodes.FORBIDDEN,
            "You can only delete your own posts"
        );
    }

    const deletedCount = await postQuery.deletePost({ postId, userId });
    if (deletedCount === 0) {
        throw httpError(StatusCodes.NOT_FOUND, "Post not found");
    }

    return {
        status: StatusCodes.OK,
        message: "Post deleted successfully",
    };
};
