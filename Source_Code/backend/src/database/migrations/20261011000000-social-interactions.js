module.exports = {
    async up(q) {
        await q.sequelize.transaction(async (transaction) => {
            await q.sequelize.query(`
    ALTER TABLE posts ADD COLUMN media JSONB NOT NULL DEFAULT '[]';
    CREATE TABLE likes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id,post_id));
    CREATE TABLE comments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE saves (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id,post_id));
    CREATE TABLE messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, contents TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id UUID REFERENCES posts(id) ON DELETE CASCADE, type VARCHAR(20) NOT NULL, content TEXT NOT NULL, read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE interactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id UUID REFERENCES posts(id) ON DELETE CASCADE, target_user_id UUID REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(20) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE INDEX likes_post ON likes(post_id);
    CREATE INDEX comments_post ON comments(post_id,created_at);
    CREATE INDEX messages_conversation ON messages(sender_id,receiver_id,created_at);
    CREATE INDEX notifications_receiver ON notifications(receiver_id,created_at);
    CREATE INDEX interactions_user ON interactions(user_id,created_at);
   `, { transaction });
        });
    },
    async down(q) {
        await q.sequelize.transaction(async (transaction) => {
            await q.sequelize.query('DROP TABLE interactions, notifications, messages, saves, comments, likes; ALTER TABLE posts DROP COLUMN media;', { transaction });
        });
    }
};
