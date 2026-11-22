module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.transaction(async transaction => {
            await queryInterface.sequelize.query(`
                ALTER TABLE comments
                    ADD COLUMN parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
                ALTER TABLE likes ALTER COLUMN post_id DROP NOT NULL;
                ALTER TABLE likes
                    ADD COLUMN comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
                CREATE UNIQUE INDEX likes_user_comment_unique
                    ON likes(user_id, comment_id) WHERE comment_id IS NOT NULL;
                CREATE INDEX comments_parent ON comments(parent_comment_id, created_at);
            `, { transaction });
        });
    },
    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async transaction => {
            await queryInterface.sequelize.query(`
                DROP INDEX IF EXISTS comments_parent;
                DROP INDEX IF EXISTS likes_user_comment_unique;
                DELETE FROM likes WHERE comment_id IS NOT NULL;
                ALTER TABLE likes DROP COLUMN comment_id;
                ALTER TABLE likes ALTER COLUMN post_id SET NOT NULL;
                ALTER TABLE comments DROP COLUMN parent_comment_id;
            `, { transaction });
        });
    }
};
