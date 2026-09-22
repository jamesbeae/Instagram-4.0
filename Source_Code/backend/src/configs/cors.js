const allowOrigins = require("./allowOrigins");

module.exports = {
    origin(origin, callback) {
        if (!origin || allowOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
};
