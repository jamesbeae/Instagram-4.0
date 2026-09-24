const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
    sequelize.define(
        "Post",
        {
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
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            mediaUrl: {
                type: DataTypes.TEXT,
                allowNull: false,
                field: "media_url",
            },
        },
        { tableName: "posts", underscored: true }
    );
