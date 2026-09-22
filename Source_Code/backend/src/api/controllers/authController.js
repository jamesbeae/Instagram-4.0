const sequelizeAuthService = require("../services/sequelizeAuthService");

// Sign up
exports.signUp = async (req, res, next) => {
    try {
        const result = await sequelizeAuthService.register(req.body);
        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

// Log in
exports.login = async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const result = await sequelizeAuthService.login(
            res,
            username,
            password
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Login with Facebook:
exports.loginWithFacebook = async (req, res, next) => {
    const error = new Error("Facebook login is not configured yet");
    error.status = 501;
    next(error);
};

// Log out:
exports.logout = async (req, res, next) => {
    try {
        const result = await sequelizeAuthService.logout(
            res,
            req.currentUser.id
        );
        req.currentUser = null;
        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

// refresh access token:
exports.refreshAccessToken = async (req, res, next) => {
    try {
        const result = await sequelizeAuthService.refreshAccessToken(
            res,
            req.cookies?.jwt
        );
        res.status(result.status).json(result);
    } catch (error) {
        next(error);
    }
};

// Current authenticated user:
exports.me = async (req, res, next) => {
    try {
        const userInfo = await sequelizeAuthService.getCurrentUser(
            req.currentUser.id
        );
        res.status(200).json({ userInfo });
    } catch (error) {
        next(error);
    }
};
