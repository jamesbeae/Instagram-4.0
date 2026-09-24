const { StatusCodes } = require("http-status-codes");

const {
    User: SequelizeUser,
    Follow,
    Post,
} = require("../../database/models");
const serializeUser = (user) => {
    const data =
        typeof user.get === "function"
            ? user.get({ plain: true })
            : user;

    const {
        passwordHash,
        refreshToken,
        roleId,
        Follow: _follow,
        ...safeUser
    } = data;

    return {
        ...safeUser,
        _id: data.id,
    };
};
const serializeProfilePost = (post) => {
    const data =
        typeof post.get === "function"
            ? post.get({ plain: true })
            : post;

    return {
        ...data,
        _id: data.id,
        caption: data.content,
        photoVideo: data.mediaUrl
            ? [
                  {
                      _id: data.id,
                      url: data.mediaUrl,
                  },
              ]
            : [],
        likes: [],
        comments: [],
    };
};
const httpError = (status, message) =>
    Object.assign(new Error(message), { status });
// Get All Users:
exports.getAllUsers = async () => {
    try {
        const allUsers = await SequelizeUser.findAll({
            attributes: [
                "id",
                "username",
                "email",
                "fullName",
                "bio",
                "avatar",
                "createdAt",
                "updatedAt",
            ],
            order: [["createdAt", "ASC"]],
        });

        return {
            users: allUsers.map(serializeUser),
            status: StatusCodes.OK,
        };
    } catch (error) {
        console.log(error);
        throw {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Error to get all users!",
        };
    }
};

// Get Suggested Users:
exports.getSuggestedUsers = (currentUserId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const suggestedUsers = await userQuery.getSuggestedUsers(
                currentUserId
            );

            resolve({
                users: suggestedUsers,
                status: StatusCodes.OK,
            });
        } catch (error) {
            reject({
                status: StatusCodes.INTERNAL_SERVER_ERROR,
                message: "Error to get suggested users!",
            });
        }
    });
};

// Get User Profile:
exports.getUserProfile = async (profileId) => {
    if (!profileId) {
        throw httpError(
            StatusCodes.BAD_REQUEST,
            "Profile id is required"
        );
    }

    const user = await SequelizeUser.findByPk(profileId, {
        attributes: {
            exclude: ["passwordHash", "refreshToken"],
        },
        include: [
            {
                model: SequelizeUser,
                as: "followers",
                attributes: [
                    "id",
                    "username",
                    "email",
                    "fullName",
                    "bio",
                    "avatar",
                ],
                through: {
                    attributes: [],
                },
            },
            {
                model: SequelizeUser,
                as: "followings",
                attributes: [
                    "id",
                    "username",
                    "email",
                    "fullName",
                    "bio",
                    "avatar",
                ],
                through: {
                    attributes: [],
                },
            },
            {
                model: Post,
                as: "posts",
                separate: true,
                order: [["createdAt", "DESC"]],
            },
        ],
    });

    if (!user) {
        throw httpError(StatusCodes.NOT_FOUND, "User not found");
    }

    const data = user.get({ plain: true });

    return {
        status: StatusCodes.OK,
        profile: {
            ...serializeUser(data),
            followers: (data.followers || []).map(serializeUser),
            followings: (data.followings || []).map(serializeUser),
            posts: (data.posts || []).map(serializeProfilePost),
            saved: [],
        },
    };
};

// Create Follow:
exports.createFollow = async (userId, followingId) => {
    if (!followingId) {
        throw httpError(
            StatusCodes.BAD_REQUEST,
            "Following user id is required"
        );
    }

    if (userId === followingId) {
        throw httpError(
            StatusCodes.BAD_REQUEST,
            "You cannot follow yourself"
        );
    }

    const followingUser = await SequelizeUser.findByPk(followingId);

    if (!followingUser) {
        throw httpError(
            StatusCodes.NOT_FOUND,
            "User not found"
        );
    }

    const [, created] = await Follow.findOrCreate({
        where: {
            followerId: userId,
            followingId,
        },
        defaults: {
            followerId: userId,
            followingId,
        },
    });

    return {
        status: StatusCodes.OK,
        message: created
            ? "Followed successfully!"
            : "You are already following this user",
        following: true,
    };
};

// Delete Follow:
exports.deleteFollow = async (userId, followingId) => {
    if (!followingId) {
        throw httpError(
            StatusCodes.BAD_REQUEST,
            "Following user id is required"
        );
    }

    const deletedCount = await Follow.destroy({
        where: {
            followerId: userId,
            followingId,
        },
    });

    if (deletedCount === 0) {
        throw httpError(
            StatusCodes.NOT_FOUND,
            "Follow relationship not found"
        );
    }

    return {
        status: StatusCodes.OK,
        message: "Unfollowed successfully!",
        following: false,
    };
};