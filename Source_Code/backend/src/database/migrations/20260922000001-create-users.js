const { DataTypes } = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("users", {
            id: {
                type: DataTypes.UUID,
                defaultValue: queryInterface.sequelize.literal(
                    "gen_random_uuid()"
                ),
                primaryKey: true,
                allowNull: false,
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
            },
            password_hash: DataTypes.STRING,
            full_name: { type: DataTypes.STRING(120), allowNull: false },
            bio: DataTypes.TEXT,
            avatar: DataTypes.TEXT,
            refresh_token: DataTypes.TEXT,
            role_id: {
                type: DataTypes.UUID,
                references: { model: "roles", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            },
            created_at: { type: DataTypes.DATE, allowNull: false },
            updated_at: { type: DataTypes.DATE, allowNull: false },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("users");
    },
};
