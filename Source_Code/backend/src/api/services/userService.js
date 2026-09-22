const { StatusCodes } = require("http-status-codes");
const userQuery = require("../mongooseQuery/userQuery");
const postQuery = require("../mongooseQuery/postQuery");
const { User: SequelizeUser } = require("../../database/models");

const serializeUser = (user) => {
    const data = user.get({ plain: true });
    const { passwordHash, refreshToken, ...safeUser } = data;

    return {
        ...safeUser,
        _id: data.id,
    };
};

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
exports.getUserProfile = (_id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await userQuery.findAnUser({ _id });
            const userPosts = await postQuery.getUserPosts(user._id);
            resolve({
                status: StatusCodes.OK,
                profile: {
                    ...user._doc,
                    posts: userPosts,
                },
            });
        } catch (error) {
            console.log(error);
            reject({
                status: StatusCodes.INTERNAL_SERVER_ERROR,
                message: "Error to get user profile!",
            });
        }
    });
};

// Create Follow:
exports.createFollow = (userId, followingId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await userQuery.createFollow(userId, followingId);
            resolve({
                status: StatusCodes.OK,
                message: "Followed successfully!",
                result,
            });
        } catch (error) {
            console.log(error);
            reject({
                status: StatusCodes.INTERNAL_SERVER_ERROR,
                message: "Error to follow user!",
            });
        }
    });
};

// Delete Follow:
exports.deleteFollow = (userId, followingId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await userQuery.deleteFollow(userId, followingId);
            resolve({
                status: StatusCodes.OK,
                message: "Unfollowed successfully!",
                result,
            });
        } catch (error) {
            console.log(error);
            reject({
                status: StatusCodes.INTERNAL_SERVER_ERROR,
                message: "Error to unfollow user!",
            });
        }
    });
};
