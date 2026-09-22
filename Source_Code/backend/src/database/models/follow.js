const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
    sequelize.define(
        "Follow",
        {
            followerId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "follower_id",
                primaryKey: true,
            },
            followingId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "following_id",
                primaryKey: true,
            },
        },
        { tableName: "follows", underscored: true }
    );
