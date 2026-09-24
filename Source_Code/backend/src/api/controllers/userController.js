const userService = require("../services/userService");

// Get All Users:
exports.getAllUsers = async (req, res, next) => {
    try {
        const result = await userService.getAllUsers();
        res.json(result);
    } catch (error) {
        console.log(error);
        next(error);
    }
};

// Get Suggested Users:
exports.getSuggestedUsers = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser.id;
        const result = await userService.getSuggestedUsers(currentUserId);
        res.json(result);
    } catch (error) {
        console.log(error);
        next(error);
    }
};

// get User Profile:
exports.getUserProfile = async (req, res, next) => {
    try {
        const profileId = req.query._id;
        const result = await userService.getUserProfile(profileId);

        res.set({
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            Pragma: "no-cache",
            Expires: "0",
        });

        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

// Create Follow:
exports.createFollow = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser.id;
        const followingId = req.body.userId;

        const result = await userService.createFollow(
            currentUserId,
            followingId
        );

        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

// Delete Follow:
exports.deleteFollow = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser.id;
        const followingId = req.body.userId;

        const result = await userService.deleteFollow(
            currentUserId,
            followingId
        );

        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};
