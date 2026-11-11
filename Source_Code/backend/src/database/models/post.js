const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("Post", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
    },
    kind: { type: DataTypes.STRING, defaultValue: "POST" },
    expiresAt: DataTypes.DATE,
    visibility: { type: DataTypes.STRING, defaultValue: "public" },
    groupId: DataTypes.UUID,
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false },
    media: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    mediaUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "media_url",
    },
}, { tableName: "posts", underscored: true });
