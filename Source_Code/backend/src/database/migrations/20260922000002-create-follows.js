const { DataTypes } = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("follows", {
            follower_id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            following_id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            created_at: { type: DataTypes.DATE, allowNull: false },
            updated_at: { type: DataTypes.DATE, allowNull: false },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("follows");
    },
};
