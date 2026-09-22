const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
    sequelize.define(
        "Role",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(30),
                allowNull: false,
                unique: true,
            },
        },
        { tableName: "roles", underscored: true }
    );
