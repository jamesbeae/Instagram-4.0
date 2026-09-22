const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const { Role, User } = require("../../database/models");
const {
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
    hashPassword,
    storeRefreshTokenToCookie,
} = require("../helpers/authHelper");

const httpError = (status, message) =>
    Object.assign(new Error(message), { status });

const userInclude = [
    {
        model: Role,
        as: "role",
        attributes: ["id", "name"],
    },
];

const serializeUser = (user) => {
    const plainUser = user.get({ plain: true });
    const { passwordHash, refreshToken, roleId, ...safeUser } = plainUser;

    return {
        ...safeUser,
        _id: safeUser.id,
    };
};
const findUserById = (id) =>
    User.findByPk(id, {
        include: userInclude,
    });

exports.register = async ({ username, password, email, fullName }) => {
    const [existedEmail, existedUsername] = await Promise.all([
        User.findOne({ where: { email } }),
        User.findOne({ where: { username } }),
    ]);

    if (existedEmail) {
        throw httpError(StatusCodes.CONFLICT, "email");
    }

    if (existedUsername) {
        throw httpError(StatusCodes.CONFLICT, "username");
    }

    const defaultRole = await Role.findOne({ where: { name: "user" } });
    if (!defaultRole) {
        throw httpError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Default user role is missing. Run database seeders first."
        );
    }

    try {
        const user = await User.create({
            username,
            email,
            fullName,
            passwordHash: await hashPassword(password),
            roleId: defaultRole.id,
        });

        const createdUser = await findUserById(user.id);
        return {
            status: StatusCodes.CREATED,
            message: "Registered successfully",
            data: serializeUser(createdUser),
        };
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            const field = error.errors?.[0]?.path;
            throw httpError(
                StatusCodes.CONFLICT,
                field === "email" ? "email" : "username"
            );
        }
        throw error;
    }
};

exports.login = async (res, username, password) => {
    const user = await User.findOne({
        where: { username },
        include: userInclude,
    });

    if (!user) {
        throw httpError(StatusCodes.UNAUTHORIZED, "username");
    }

    if (
        !user.passwordHash ||
        !(await comparePassword(password, user.passwordHash))
    ) {
        throw httpError(StatusCodes.UNAUTHORIZED, "password");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    storeRefreshTokenToCookie(res, refreshToken);

    return {
        userInfo: serializeUser(user),
        accessToken,
    };
};

exports.refreshAccessToken = async (res, refreshToken) => {
    if (!refreshToken) {
        throw httpError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_CODE);
    } catch (error) {
        throw httpError(StatusCodes.FORBIDDEN, "Forbidden");
    }

    const user = await User.findOne({
        where: {
            id: decoded.userInfo?.id,
            refreshToken,
        },
        include: userInclude,
    });

    if (!user) {
        throw httpError(StatusCodes.FORBIDDEN, "Forbidden");
    }

    const accessToken = generateAccessToken(user);
    return {
        status: StatusCodes.OK,
        newAccessToken: accessToken,
        // Keep the old response key because the current frontend reads it.
        refreshToken: accessToken,
    };
};

exports.logout = async (res, userId) => {
    if (userId) {
        await User.update(
            { refreshToken: null },
            { where: { id: userId } }
        );
    }

    storeRefreshTokenToCookie(res, null, { maxAge: 0 });
    return {
        status: StatusCodes.OK,
        message: "Logout successfully",
    };
};

exports.getCurrentUser = async (userId) => {
    const user = await findUserById(userId);
    if (!user) {
        throw httpError(StatusCodes.NOT_FOUND, "User not found");
    }
    return serializeUser(user);
};
