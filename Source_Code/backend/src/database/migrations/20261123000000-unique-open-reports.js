module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            WITH ranked AS (
                SELECT id,
                       row_number() OVER (
                           PARTITION BY reporter_id, post_id
                           ORDER BY created_at, id
                       ) AS position
                  FROM reports
                 WHERE status = 'open' AND post_id IS NOT NULL
            )
            UPDATE reports
               SET status = 'duplicate'
             WHERE id IN (SELECT id FROM ranked WHERE position > 1);

            WITH ranked AS (
                SELECT id,
                       row_number() OVER (
                           PARTITION BY reporter_id, target_user_id
                           ORDER BY created_at, id
                       ) AS position
                  FROM reports
                 WHERE status = 'open' AND target_user_id IS NOT NULL
            )
            UPDATE reports
               SET status = 'duplicate'
             WHERE id IN (SELECT id FROM ranked WHERE position > 1);

            CREATE UNIQUE INDEX reports_one_open_post_report_per_reporter
                ON reports (reporter_id, post_id)
             WHERE status = 'open' AND post_id IS NOT NULL;
            CREATE UNIQUE INDEX reports_one_open_user_report_per_reporter
                ON reports (reporter_id, target_user_id)
             WHERE status = 'open' AND target_user_id IS NOT NULL;
        `);
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            DROP INDEX IF EXISTS reports_one_open_post_report_per_reporter;
            DROP INDEX IF EXISTS reports_one_open_user_report_per_reporter;
            UPDATE reports SET status = 'open' WHERE status = 'duplicate';
        `);
    }
};
