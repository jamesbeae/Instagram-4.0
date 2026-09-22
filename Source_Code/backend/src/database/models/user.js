const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
    sequelize.define(
        "User",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            username: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
                validate: { isEmail: true },
            },
            passwordHash: {
                type: DataTypes.STRING,
                allowNull: true,
                field: "password_hash",
            },
            fullName: {
                type: DataTypes.STRING(120),
                allowNull: false,
                field: "full_name",
            },
            bio: DataTypes.TEXT,
            avatar: DataTypes.TEXT,
            refreshToken: {
                type: DataTypes.TEXT,
                field: "refresh_token",
            },
            roleId: {
                type: DataTypes.UUID,
                field: "role_id",
            },
        },
        { tableName: "users", underscored: true }
    );
