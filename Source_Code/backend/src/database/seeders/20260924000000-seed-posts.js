const bcrypt = require("bcryptjs");
const { Op, QueryTypes } = require("sequelize");

const DEMO_PASSWORD = "12345678";
const DEMO_USERS = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        username: "owner",
        email: "owner@example.com",
        full_name: "Chủ bài mẫu",
        bio: "Tài khoản mẫu dùng để kiểm thử API bài viết",
        avatar: "https://i.pravatar.cc/150?img=12",
    },
    {
        id: "22222222-2222-4222-8222-222222222222",
        username: "viewer",
        email: "viewer@example.com",
        full_name: "Người xem mẫu",
        bio: "Tài khoản mẫu dùng để kiểm tra quyền sở hữu bài viết",
        avatar: "https://i.pravatar.cc/150?img=32",
    },
];

const DEMO_POST_IDS = [
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
];

module.exports = {
    async up(queryInterface) {
        const [userRole] = await queryInterface.sequelize.query(
            'SELECT id FROM roles WHERE name = \'user\' LIMIT 1',
            { type: QueryTypes.SELECT }
        );
        if (!userRole) {
            throw new Error("User role is missing. Run the role seeder first.");
        }

        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
        const now = new Date();
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.bulkDelete(
                "posts",
                { id: { [Op.in]: DEMO_POST_IDS } },
                { transaction }
            );
            await queryInterface.bulkDelete(
                "users",
                {
                    [Op.or]: [
                        { id: { [Op.in]: DEMO_USERS.map((user) => user.id) } },
                        {
                            username: {
                                [Op.in]: DEMO_USERS.map(
                                    (user) => user.username
                                ),
                            },
                        },
                        {
                            email: {
                                [Op.in]: DEMO_USERS.map((user) => user.email),
                            },
                        },
                    ],
                },
                { transaction }
            );

            await queryInterface.bulkInsert(
                "users",
                DEMO_USERS.map((user) => ({
                    ...user,
                    password_hash: passwordHash,
                    role_id: userRole.id,
                    created_at: now,
                    updated_at: now,
                })),
                { transaction }
            );

            await queryInterface.bulkInsert(
                "posts",
                [
                    {
                        id: DEMO_POST_IDS[0],
                        user_id: DEMO_USERS[0].id,
                        content: "Một buổi sáng bình yên trong dữ liệu mẫu.",
                        media_url:
                            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
                        created_at: new Date(now.getTime() - 120000),
                        updated_at: new Date(now.getTime() - 120000),
                    },
                    {
                        id: DEMO_POST_IDS[1],
                        user_id: DEMO_USERS[1].id,
                        content: "Bài viết mẫu thứ hai dùng để kiểm tra phân trang.",
                        media_url:
                            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
                        created_at: new Date(now.getTime() - 60000),
                        updated_at: new Date(now.getTime() - 60000),
                    },
                    {
                        id: DEMO_POST_IDS[2],
                        user_id: DEMO_USERS[0].id,
                        content: "Bài viết mẫu mới nhất sẽ xuất hiện đầu tiên.",
                        media_url:
                            "https://images.unsplash.com/photo-1470770841072-f978cf4d019e",
                        created_at: now,
                        updated_at: now,
                    },
                ],
                { transaction }
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.bulkDelete(
                "posts",
                { id: { [Op.in]: DEMO_POST_IDS } },
                { transaction }
            );
            await queryInterface.bulkDelete(
                "users",
                { id: { [Op.in]: DEMO_USERS.map((user) => user.id) } },
                { transaction }
            );
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
