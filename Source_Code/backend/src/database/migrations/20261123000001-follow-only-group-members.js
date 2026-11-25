module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.transaction(async transaction => {
            await queryInterface.sequelize.query(`
                CREATE TABLE group_members_follow_cleanup_backup (
                    group_id UUID NOT NULL,
                    user_id UUID NOT NULL,
                    PRIMARY KEY (group_id, user_id)
                );
                INSERT INTO group_members_follow_cleanup_backup (group_id, user_id)
                SELECT gm.group_id, gm.user_id
                  FROM group_members gm
                  JOIN groups g ON g.id = gm.group_id
                 WHERE NOT EXISTS (
                     SELECT 1 FROM follows f
                      WHERE f.follower_id = g.owner_id
                        AND f.following_id = gm.user_id
                 );
                DELETE FROM group_members gm
                 USING group_members_follow_cleanup_backup b
                 WHERE gm.group_id = b.group_id AND gm.user_id = b.user_id;
            `, { transaction });
        });
    },
    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async transaction => {
            await queryInterface.sequelize.query(`
                INSERT INTO group_members (group_id, user_id, created_at, updated_at)
                SELECT b.group_id, b.user_id, now(), now()
                  FROM group_members_follow_cleanup_backup b
                  JOIN groups g ON g.id = b.group_id
                  JOIN users u ON u.id = b.user_id
                ON CONFLICT (group_id, user_id) DO NOTHING;
                DROP TABLE group_members_follow_cleanup_backup;
            `, { transaction });
        });
    }
};
