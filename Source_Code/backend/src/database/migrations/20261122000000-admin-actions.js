module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            CREATE TABLE admin_actions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
                action VARCHAR(40) NOT NULL,
                details JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX admin_actions_created_at ON admin_actions(created_at DESC);
        `);
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP TABLE admin_actions;');
    }
};
