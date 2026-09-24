const { DataTypes } = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("posts", {
            id: {
                type: DataTypes.UUID,
                defaultValue: queryInterface.sequelize.literal(
                    "gen_random_uuid()"
                ),
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            media_url: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            created_at: { type: DataTypes.DATE, allowNull: false },
            updated_at: { type: DataTypes.DATE, allowNull: false },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("posts");
    },
};
