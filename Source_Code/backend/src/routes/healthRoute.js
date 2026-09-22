const express = require("express");
const sequelize = require("../config/database");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({
            status: "ok",
            database: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: "error",
            database: "disconnected",
            message: error.message,
        });
    }
});

module.exports = router;
