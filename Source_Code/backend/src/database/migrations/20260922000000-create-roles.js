const { DataTypes } = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
        );
        await queryInterface.createTable("roles", {
            id: {
                type: DataTypes.UUID,
                defaultValue: queryInterface.sequelize.literal(
                    "gen_random_uuid()"
                ),
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(30),
                allowNull: false,
                unique: true,
            },
            created_at: { type: DataTypes.DATE, allowNull: false },
            updated_at: { type: DataTypes.DATE, allowNull: false },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("roles");
    },
};
