module.exports = {
    async up({ sequelize }) {
        await sequelize.transaction(async transaction => {
            await sequelize.query(`
                ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;
                UPDATE messages SET read_at = created_at;
                CREATE INDEX messages_unread_recipient ON messages(receiver_id, sender_id) WHERE read_at IS NULL;
            `, { transaction });
        });
    },
    async down({ sequelize }) {
        await sequelize.query('ALTER TABLE messages DROP COLUMN read_at');
    },
};
