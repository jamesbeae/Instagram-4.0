module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.transaction(async transaction => {
            await queryInterface.sequelize.query(`
                ALTER TABLE posts
                    DROP CONSTRAINT IF EXISTS posts_kind_check;

                ALTER TABLE posts
                    ADD CONSTRAINT posts_kind_check
                    CHECK (kind IN ('POST', 'STORY', 'REEL'));
            `, { transaction });
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async transaction => {
            const [rows] = await queryInterface.sequelize.query(
                "SELECT EXISTS (SELECT 1 FROM posts WHERE kind = 'REEL') AS has_reels",
                { transaction },
            );

            if (rows[0]?.has_reels) {
                throw new Error('Cannot roll back Reel support while Reel posts exist.');
            }

            await queryInterface.sequelize.query(`
                ALTER TABLE posts
                    DROP CONSTRAINT IF EXISTS posts_kind_check;

                ALTER TABLE posts
                    ADD CONSTRAINT posts_kind_check
                    CHECK (kind IN ('POST', 'STORY'));
            `, { transaction });
        });
    },
};
