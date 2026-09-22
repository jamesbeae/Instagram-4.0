const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const getSecret = (name) => {
    const secret = process.env[name];
    if (!secret) {
        throw new Error(`${name} is not configured`);
    }
    return secret;
};

// hash password:
exports.hashPassword = (password) => {
    return bcrypt.hash(password, 12);
};

// compare password:
exports.comparePassword = (p1, p2) => {
    return bcrypt.compare(p1, p2);
};

// generate access token:
exports.generateAccessToken = (userInfo) => {
    const accessToken = jwt.sign(
        {
            userInfo: {
                username: userInfo.username,
                id: userInfo.id,
            },
        },
        getSecret("ACCESS_TOKEN_CODE"),
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "30d",
        }
    );
    return accessToken;
};

// generate refresh token token:
exports.generateRefreshToken = (userInfo) => {
    const refreshToken = jwt.sign(
        {
            userInfo: {
                username: userInfo.username,
                id: userInfo.id || userInfo.facebookId,
            },
        },
        getSecret("REFRESH_TOKEN_CODE"),
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
        }
    );
    return refreshToken;
};

// store refresh token to cookie:
exports.storeRefreshTokenToCookie = (res, refreshToken, cookieConfigs = {}) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("jwt", refreshToken || "", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        ...cookieConfigs,
    });
};
