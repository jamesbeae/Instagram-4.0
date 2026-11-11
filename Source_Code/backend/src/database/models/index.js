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
const { DataTypes: D } = require('sequelize');
const uuid = () => ({ type: D.UUID, allowNull: false });
const define = (name, tableName, fields) => sequelize.define(name, {
    id: { type: D.UUID, defaultValue: D.UUIDV4, primaryKey: true }, ...fields
}, { tableName, underscored: true });
const Like = define('Like', 'likes', { userId: uuid(), postId: uuid() });
const Comment = define('Comment', 'comments', { userId: uuid(), postId: uuid(), content: { type: D.TEXT, allowNull: false } });
const Save = define('Save', 'saves', { userId: uuid(), postId: uuid() });
const Message = define('Message', 'messages', { senderId: uuid(), receiverId: uuid(), contents: { type: D.TEXT, allowNull: false } });
const Notification = define('Notification', 'notifications', { senderId: uuid(), receiverId: uuid(), postId: { type: D.UUID }, type: D.STRING(20), content: D.TEXT, read: { type: D.BOOLEAN, defaultValue: false } });
const Interaction = define('Interaction', 'interactions', { userId: uuid(), postId: { type: D.UUID }, targetUserId: { type: D.UUID }, type: D.STRING(20) });
Post.hasMany(Like, { foreignKey: 'postId', as: 'likes' });
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Post.hasMany(Save, { foreignKey: 'postId', as: 'saves' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Save.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
const Group = define('Group', 'groups', { ownerId: uuid(), name: D.STRING(100) });
const GroupMember = define('GroupMember', 'group_members', { groupId: uuid(), userId: uuid() });
const Report = define('Report', 'reports', { reporterId: uuid(), postId: D.UUID, targetUserId: D.UUID, reason: D.STRING(2000), status: { type: D.STRING(20), defaultValue: 'open' } });
const PasswordReset = define('PasswordReset', 'password_resets', { userId: uuid(), tokenHash: D.STRING(64), expiresAt: D.DATE });
Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'members' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
module.exports = { Group, GroupMember, Report, PasswordReset, sequelize, Role, User, Follow, Post, Like, Comment, Save, Message, Notification, Interaction };
