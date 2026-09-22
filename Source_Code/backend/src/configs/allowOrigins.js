const configuredOrigins =
    process.env.FRONTEND_URL ||
    "http://localhost:5173,http://localhost:3000";

module.exports = configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
