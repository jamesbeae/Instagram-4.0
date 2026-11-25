const { parseArgs } = require('node:util');
const Joi = require('joi');

require('dotenv').config();
const { hashPassword } = require('../src/api/helpers/authHelper');
const { signUpSchema } = require('../src/api/validations/authValidation');
const { sequelize, User, Role, AdminAction } = require('../src/database/models');

class BootstrapError extends Error {}

const schema = signUpSchema.keys({
    username: Joi.string().trim().min(3).max(30).required(),
    fullName: Joi.string().trim().min(3).max(100).required(),
    password: Joi.string().min(12).max(72, 'utf8').required(),
});

async function readPassword() {
    if (process.stdin.isTTY) throw new BootstrapError('Pipe a password from a masked prompt to stdin.');
    process.stdin.setEncoding('utf8');
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
        if (input.length > 1024) throw new BootstrapError('Expected one password on stdin.');
    }
    return input.replace(/\r?\n$/, '');
}

async function main() {
    let args;
    try {
        ({ values: args } = parseArgs({
            options: { username: { type: 'string' }, email: { type: 'string' }, 'full-name': { type: 'string' } },
        }));
    } catch {
        throw new BootstrapError('Usage: node scripts/bootstrap-admin.cjs --username NAME --email EMAIL --full-name "Full Name"');
    }

    if (!args.username || !args.email || !args['full-name'])
        throw new BootstrapError('Provide --username, --email and --full-name.');

    const password = await readPassword();
    if (/[\r\n\0]/u.test(password)) throw new BootstrapError('Expected one password on stdin.');
    const { value, error } = schema.validate({
        username: args.username, email: args.email.trim(), fullName: args['full-name'],
        password, confirmPassword: password,
    });
    if (error) {
        const field = error.details[0].path[0];
        if (field === 'password' || field === 'confirmPassword')
            throw new BootstrapError('Use a password with at least 12 characters and at most 72 UTF-8 bytes.');
        throw new BootstrapError(`Invalid ${field}. Check the account details and try again.`);
    }

    const passwordHash = await hashPassword(value.password);
    await sequelize.transaction(async transaction => {
        // Lock the role row so concurrent bootstrap attempts cannot both create an admin.
        const role = await Role.findOne({ where: { name: 'admin' }, transaction, lock: transaction.LOCK.UPDATE });
        if (!role) throw new BootstrapError('The admin role is missing. Run database migrations first.');
        if (await User.count({ where: { roleId: role.id, disabled: false }, transaction }))
            throw new BootstrapError('An active admin already exists. Use Moderation → Accounts to grant admin access.');

        const user = await User.create({
            username: value.username, email: value.email, fullName: value.fullName, passwordHash, roleId: role.id,
        }, { transaction });
        await AdminAction.create({
            adminId: user.id, targetUserId: user.id, action: 'BOOTSTRAP_ADMIN', details: { source: 'operator_cli' },
        }, { transaction });
    });
    console.log('Admin account created. Sign in with the email and password you supplied.');
}

main().catch(error => {
    const message = error instanceof BootstrapError ? error.message
        : error.name === 'SequelizeUniqueConstraintError' ? 'The email or username is already in use. Choose a new one.'
            : `Unable to create the admin account (${error.name}). Check the database connection and migrations.`;
    console.error(message);
    process.exitCode = 1;
}).finally(() => sequelize.close());
