require("dotenv").config();
const jwt = require("jsonwebtoken");

exports.verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization || "";
    const [scheme, accessToken] = authorization.split(" ");

    if (scheme !== "Bearer" || !accessToken) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_CODE);
        req.currentUser = decoded.userInfo;
        next();
    } catch (error) {
        return res
            .status(403)
            .json({ message: "Invalid or expired access token" });
    }
};
