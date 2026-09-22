const { randomUUID } = require("crypto");

module.exports = {
    async up(queryInterface) {
        const now = new Date();
        await queryInterface.bulkInsert("roles", [
            { id: randomUUID(), name: "admin", created_at: now, updated_at: now },
            { id: randomUUID(), name: "user", created_at: now, updated_at: now },
            {
                id: randomUUID(),
                name: "creator",
                created_at: now,
                updated_at: now,
            },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("roles", null, {});
    },
};
