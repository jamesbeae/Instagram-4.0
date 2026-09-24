const { Post, User } = require("../../database/models");

const userInclude = {
    model: User,
    as: "user",
    attributes: ["id", "username", "fullName", "avatar"],
};

exports.createPost = (data) => Post.create(data);

exports.findPostById = (postId) =>
    Post.findByPk(postId, {
        include: userInclude,
    });

exports.getFeed = ({ limit, offset }) =>
    Post.findAndCountAll({
        include: userInclude,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        distinct: true,
    });

exports.deletePost = ({ postId, userId }) =>
    Post.destroy({
        where: {
            id: postId,
            userId,
        },
    });
