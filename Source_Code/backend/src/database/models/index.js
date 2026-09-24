const sequelize = require("../../config/database");
const createRole = require("./role");
const createUser = require("./user");
const createFollow = require("./follow");
const createPost = require("./post");

const Role = createRole(sequelize);
const User = createUser(sequelize);
const Follow = createFollow(sequelize);
const Post = createPost(sequelize);

Role.hasMany(User, { foreignKey: "roleId", as: "users" });
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

User.hasMany(Post, { foreignKey: "userId", as: "posts" });
Post.belongsTo(User, { foreignKey: "userId", as: "user" });

User.belongsToMany(User, {
    through: Follow,
    as: "followers",
    foreignKey: "followingId",
    otherKey: "followerId",
});
User.belongsToMany(User, {
    through: Follow,
    as: "followings",
    foreignKey: "followerId",
    otherKey: "followingId",
});

module.exports = { sequelize, Role, User, Follow, Post };
