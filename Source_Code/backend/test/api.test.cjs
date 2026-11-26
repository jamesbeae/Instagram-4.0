// Isolated, disposable database; never resets the running application's data.
require('dotenv').config();
const { test } = require('node:test'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto'), { spawn, spawnSync } = require('node:child_process');
const { Client } = require('pg');
test('PostgreSQL APIs and authenticated Socket.IO', { timeout: 90000 }, async (t) => {
    const source = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
    const admin = new Client({ connectionString: source.href });
    await admin.connect();
    const db = 'instagram_test_' + randomUUID().replaceAll('-', '');
    let server, socket1, socket2, mailServer;
    const mailbox = [];
    mailServer = require("node:http").createServer(async (req, res) => { let body = ""; for await (const chunk of req)
        body += chunk; mailbox.push(JSON.parse(body)); res.setHeader("Content-Type", "application/json"); res.end("{}"); });
    await new Promise(resolve => mailServer.listen(18001, "127.0.0.1", resolve));
    await admin.query('CREATE DATABASE "' + db + '"');
    source.pathname = '/' + db;
    const env = { ...process.env, DATABASE_URL: source.href, PORT: '18000', NODE_ENV: 'test', DB_LOGGING: 'false', RESEND_API_KEY: 'test-key', MAIL_FROM: 'test@example.com', TEST_MAIL_ENDPOINT: 'http://127.0.0.1:18001', CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '' };
    const api = 'http://127.0.0.1:18000/v1/api';
    try {
        const migrate = spawnSync(process.execPath, ['node_modules/sequelize-cli/lib/sequelize', 'db:migrate'], { env, encoding: 'utf8' });
        assert.equal(migrate.status, 0, migrate.stderr);
        const seed = spawnSync(process.execPath, ['node_modules/sequelize-cli/lib/sequelize', 'db:seed:all'], { env, encoding: 'utf8' });
        assert.equal(seed.status, 0, seed.stderr);
        server = spawn(process.execPath, ['src/app.js'], { env, stdio: ['ignore', 'ignore', 'pipe'] });
        let errors = '';
        server.stderr.on('data', d => { errors += d; });
        for (let i = 0; i < 60; i++) {
            try {
                if ((await fetch('http://127.0.0.1:18000/health')).ok)
                    break;
            }
            catch { }
            await new Promise(r => setTimeout(r, 200));
        }
        const request = async (method, url, body, token) => { const r = await fetch(api + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json() }; };
        assert.equal((await request('POST', '/auth/register', { email: 'newuser@example.com', fullName: 'New User', username: 'new_user', password: 'NewUser123', confirmPassword: 'Different123' })).status, 400);
        const registered = await request('POST', '/auth/register', { email: 'newuser@example.com', fullName: 'New User', username: 'new_user', password: 'NewUser123', confirmPassword: 'NewUser123' });
        assert.equal(registered.status, 201);
        assert.equal(registered.data.data.role.name, 'user');
        assert.equal((await request('POST', '/auth/register', { email: 'newuser@example.com', fullName: 'New User', username: 'another_user', password: 'NewUser123', confirmPassword: 'NewUser123' })).status, 409);
        assert.equal((await request('POST', '/auth/login', { username: 'owner', password: '12345678' })).status, 400);
        assert.equal((await request('POST', '/auth/login', { email: 'not-an-email', password: '12345678' })).status, 400);
        const owner = (await request('POST', '/auth/login', { email: 'owner@example.com', password: '12345678' })).data;
        const viewer = (await request('POST', '/auth/login', { email: 'viewer@example.com', password: '12345678' })).data;
        assert(owner.accessToken);
        assert(viewer.accessToken);
        const o = owner.accessToken, v = viewer.accessToken, ownerId = owner.userInfo._id, viewerId = viewer.userInfo._id;
        assert.equal((await request('GET', '/user/get-suggested-users', null, v)).data.users.some(user => user._id === viewerId), false);
        assert.equal((await request('GET', '/user/get-suggested-users', null, v)).status, 200);
        assert.equal((await request('GET', '/post/recommended', null, v)).status, 200);
        assert.equal((await request('GET', '/post/recommended')).status, 401);
        const create = await request('POST', '/post/create-post', { caption: 'Post for integration verification', photoVideoList: [{ url: 'https://example.com/a.jpg', type: 'PHOTO' }, { url: 'https://example.com/b.webm', type: 'VIDEO' }] }, o);
        assert.equal(create.status, 201);
        const post = create.data.post;
        assert.equal(post.photoVideo.length, 2);
        assert.equal(post.userId._id, ownerId);
        assert.equal((await request('DELETE', '/post/' + post._id, null, v)).status, 403);
        assert.equal((await request('PATCH', '/post/' + post._id, { content: 'Forbidden edit' }, v)).status, 403);
        assert.equal((await request('PATCH', '/post/' + post._id, { content: 'Updated caption' }, o)).status, 200);
        assert.equal((await request('POST', '/like/create-like-post', { postId: post._id }, v)).status, 201);
        assert.equal((await request('POST', '/like/create-like-post', { postId: post._id }, v)).status, 200);
        assert.equal((await request('GET', '/post/' + post._id, null, v)).data.post.likes.length, 1);
        assert.equal((await request('POST', '/comment/create-comment', { postId: post._id, content: '   ' }, v)).status, 400);
        const comment = await request('POST', '/comment/create-comment', { postId: post._id, content: 'A comment' }, v);
        assert.equal(comment.status, 201);
        assert.equal(comment.data.comment.userId._id, viewerId);
        assert.equal((await request('GET', '/comment/get-comments?postId=' + post._id)).data.comments.length, 1);
        assert.equal((await request('POST', '/post/' + post._id + '/save', null, v)).status, 200);
        assert.equal((await request('POST', '/post/' + post._id + '/save', null, v)).status, 200);
        assert.equal((await request('GET', '/post/' + post._id, null, v)).data.post.isSaved, true);
        assert.equal((await request('GET', '/user/get-profile?_id=' + viewerId, null, v)).data.profile.saved.length, 1);
        assert.equal((await request('GET', '/user/get-profile?_id=' + viewerId, null, o)).data.profile.saved.length, 0);
        assert.equal((await request('POST', '/user/create-follow', { userId: ownerId }, v)).status, 200);
        assert.equal((await request('POST', '/user/create-follow', { userId: ownerId }, v)).status, 200);
        assert.equal((await request('GET', '/user/get-suggested-users', null, v)).data.users.some(u => u._id === ownerId), false);
        assert.equal((await request('GET', '/notification/get-all', null, o)).data.notifications.length, 3);
        assert.equal((await request('GET', '/message?sender_id=' + viewerId + '&receiver_id=' + ownerId, null, o)).status, 403);
        assert.equal((await request('GET', '/user/get-profile?_id=invalid', null, o)).status, 400);
        assert.equal((await request('POST', '/post/' + post._id + '/interaction', { type: 'VIEW' }, v)).status, 201);
        await request('POST', '/post/' + post._id + '/interaction', { type: 'VIEW' }, v);
        assert.equal((await request('GET', '/user/activity', null, v)).data.activity.filter(x => x.type === 'VIEW').length, 1);
        assert.equal((await request('PATCH', '/user/me', { fullName: 'Changed viewer', bio: 'Integration test' }, v)).status, 200);
        await t.test('merged post editing preserves ownership and updates displayed media', async () => {
            const body = { mediaUrl: 'https://example.com/replacement.jpg' };
            assert.equal((await request('PATCH', '/post/' + post._id, body, v)).status, 403);
            assert.equal((await request('PATCH', '/post/' + post._id, {}, o)).status, 400);
            const edit = await request('PATCH', '/post/' + post._id, body, o);
            assert.equal(edit.status, 200);
            assert.equal(edit.data.post.photoVideo[0].url, body.mediaUrl);
            assert.equal(edit.data.post.caption, 'Updated caption');
            // Restore the video used by the Reels scenario below.
            assert.equal((await request('PATCH', '/post/' + post._id, { mediaUrl: 'https://example.com/b.webm' }, o)).status, 200);
        });
        await t.test('merged avatar upload validates, persists and serves a public profile image', async () => {
            const avatarData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6zQAAAABJRU5ErkJggg==';
            assert.equal((await request('PATCH', '/user/profile', { avatarData })).status, 401);
            assert.equal((await request('PATCH', '/user/profile', { avatarData: 'data:image/png;base64,YWJj' }, v)).status, 400);
            const update = await request('PATCH', '/user/profile', { avatarData, fullName: 'Updated viewer' }, v);
            assert.equal(update.status, 200);
            const avatar = new URL(update.data.userInfo.avatar);
            assert.match(avatar.pathname, /^\/avatars\/[0-9a-f-]+\.png$/);
            try {
                const image = await fetch('http://127.0.0.1:18000' + avatar.pathname);
                assert.equal(image.status, 200);
                assert.match(image.headers.get('content-type'), /image\/png/);
                await image.arrayBuffer();
                const profile = await request('GET', '/user/get-profile?_id=' + viewerId, null, o);
                assert.equal(profile.data.profile.avatar, avatar.href);
                assert.equal(profile.data.profile.fullName, 'Updated viewer');
                assert.equal((await request('PATCH', '/user/profile', { avatarData: null }, v)).data.userInfo.avatar, null);
            } finally {
                await require('node:fs/promises').unlink(require('node:path').join(__dirname, '../uploads/avatars', require('node:path').basename(avatar.pathname)));
            }
        });
        const { io } = require('../../frontend/node_modules/socket.io-client');
        const connect = token => new Promise((resolve, reject) => { const socket = io('http://127.0.0.1:18000', { auth: { token }, reconnection: false, timeout: 3000 }); socket.once('connect', () => resolve(socket)); socket.once('connect_error', e => { socket.close(); reject(e); }); });
        await assert.rejects(connect('invalid'));
        socket1 = await connect(v);
        socket2 = await connect(o);
        const emit = payload => new Promise((resolve, reject) => socket1.timeout(5000).emit('sendMessage', payload, (err, r) => err ? reject(err) : resolve(r)));
        assert.equal((await emit({ senderId: ownerId, receiverId: ownerId, contents: 'Forged sender' })).status, 403);
        assert.equal((await request('GET', '/message/inbox')).status, 401);
        assert.deepEqual((await request('GET', '/message/inbox', null, v)).data, { contacts: [], unread: [], unreadCount: 0 });
        assert.equal((await request('POST', '/user/delete-follow', { userId: ownerId }, v)).status, 200);
        const recipientUrl = '/message/recipient?receiver_id=';
        assert.equal((await request('GET', recipientUrl + ownerId)).status, 401);
        const recipient = await request('GET', recipientUrl + ownerId, null, v);
        assert.equal(recipient.data.user._id, ownerId);
        assert.equal(recipient.data.user.email, undefined);
        assert.equal((await request('GET', recipientUrl + viewerId, null, v)).status, 404);
        assert.equal((await emit({ receiverId: viewerId, contents: 'Self-message' })).status, 400);
        assert.equal((await emit({ receiverId: randomUUID(), contents: 'Unknown recipient' })).status, 404);
        const typingEvent = () => new Promise((resolve, reject) => {
            const listener = event => { clearTimeout(timer); resolve(event); };
            const timer = setTimeout(() => {
                socket2.off('messageTyping', listener);
                reject(new Error('Typing status not delivered'));
            }, 3000);
            socket2.once('messageTyping', listener);
        });
        for (const typing of [true, false]) {
            const changed = typingEvent();
            socket1.emit('messageTyping', { receiverId: ownerId, typing });
            assert.deepEqual(await changed, { senderId: viewerId, typing });
        }
        await t.test('typing rejects revoked and disabled socket sessions', async () => {
            const dbClient = new Client({ connectionString: source.href });
            await dbClient.connect();
            const { rows: [original] } = await dbClient.query('SELECT token_version, disabled FROM users WHERE id=$1', [viewerId]);
            try {
                for (const [version, disabled] of [
                    [original.token_version + 1, false],
                    [original.token_version, true],
                ]) {
                    await dbClient.query('UPDATE users SET token_version=$1, disabled=$2 WHERE id=$3', [version, disabled, viewerId]);
                    const received = [];
                    const listener = event => received.push(event);
                    socket2.on('messageTyping', listener);
                    try {
                        socket1.emit('messageTyping', { receiverId: ownerId, typing: true });
                        assert.equal((await emit({ receiverId: ownerId, contents: 'Revoked sender' })).status, 401);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        assert.deepEqual(received, [], 'An invalidated session must not relay typing');
                    } finally {
                        socket2.off('messageTyping', listener);
                    }
                }
            } finally {
                await dbClient.query('UPDATE users SET token_version=$1, disabled=$2 WHERE id=$3', [original.token_version, original.disabled, viewerId]);
                await dbClient.end();
            }
        });

        const receive = new Promise(resolve => socket2.once('receiveMessage', resolve));
        const firstPayload = { receiverId: ownerId, contents: 'Realtime message', messageId: randomUUID() };
        const sent = await emit(firstPayload);
        assert.equal(sent.ok, true);
        assert.equal((await receive).sender_id, viewerId);
        assert.equal((await emit(firstPayload)).message._id, sent.message._id);
        assert.equal((await emit({ ...firstPayload, contents: 'Changed message' })).status, 409);
        const history = await request('GET', '/message?receiver_id=' + viewerId, null, o);
        assert.equal(history.data.length, 1);
        assert.equal(history.data[0]._id, sent.message._id);
        assert.equal((await request('POST', '/user/create-follow', { userId: ownerId }, v)).status, 200);
        assert.equal((await request('POST', '/user/create-follow', { userId: viewerId }, o)).status, 200);
        const latest = await emit({ receiverId: ownerId, contents: 'Second message' });
        assert.equal(latest.ok, true);
        const historyUrl = '/message?receiver_id=' + viewerId;
        const recent = await request('GET', historyUrl + '&limit=1', null, o);
        assert.deepEqual(recent.data.map(message => message._id), [latest.message._id]);
        const older = await request('GET', historyUrl + '&limit=1&before=' + latest.message._id, null, o);
        assert.deepEqual(older.data.map(message => message._id), [sent.message._id]);
        assert.deepEqual((await request('GET', '/message/inbox', null, o)).data.unread, [viewerId]);
        assert.equal((await request('POST', '/message/read', { messageId: sent.message._id }, v)).status, 404);
        assert.equal((await request('POST', '/user/delete-follow', { userId: viewerId }, o)).status, 200);
        const senderInbox = (await request('GET', '/message/inbox', null, v)).data;
        const recipientInbox = (await request('GET', '/message/inbox', null, o)).data;
        assert.deepEqual(senderInbox.contacts.map(user => user._id), [ownerId]);
        assert.deepEqual(recipientInbox.contacts.map(user => user._id), [viewerId]);
        assert.deepEqual(recipientInbox.unread, [viewerId]);
        assert.equal(recipientInbox.unreadCount, 2);
        const afterUnfollow = await emit({ receiverId: ownerId, contents: 'After unfollow' });
        assert.equal(afterUnfollow.ok, true);
        assert.equal((await emit(firstPayload)).message._id, sent.message._id);
        assert.deepEqual((await request('GET', historyUrl, null, o)).data.map(message => message._id), [sent.message._id, latest.message._id, afterUnfollow.message._id]);
        assert.equal((await request('POST', '/message/read', { messageId: afterUnfollow.message._id }, o)).status, 200);
        assert.deepEqual((await request('GET', '/message/inbox', null, o)).data.unread, []);
        const typingAfterUnfollow = typingEvent();
        socket1.emit('messageTyping', { receiverId: ownerId, typing: true });
        assert.deepEqual(await typingAfterUnfollow, { senderId: viewerId, typing: true });
        await t.test('search validates input and returns only matching permitted content', async () => {
            assert.equal((await request('GET', '/search?q=owner')).status, 200);
            assert.equal((await request('GET', '/search?q=owner', null, 'invalid')).status, 401);
            assert.equal((await request('GET', '/search?q=', null, v)).status, 400);
            assert.equal((await request('GET', '/search?q=owner&limit=21', null, v)).status, 400);
            const users = await request('GET', '/search?q=owner&scope=users', null, v);
            assert.equal(users.status, 200);
            assert.equal(users.data.users.length, 1);
            assert.equal(users.data.users[0].email, undefined);
            assert.equal(users.data.users[0].passwordHash, undefined);
            const found = await request('GET', '/search?q=Updated&scope=posts', null, v);
            assert.equal(found.status, 200);
            assert.equal(found.data.postsList[0]._id, post._id);
            const literal = (await request('POST', '/post/create-post', { content: '100% Literal_Search', mediaUrl: 'https://example.com/literal.jpg' }, o)).data.post;
            for (const q of ['%', '_']) {
                const result = await request('GET', '/search?scope=posts&q=' + encodeURIComponent(q), null, v);
                assert.equal(result.status, 200);
                assert.equal(result.data.pagination.total, 1);
                assert.equal(result.data.postsList[0]._id, literal._id);
            }
            assert.equal((await request('GET', '/search?scope=posts&q=' + encodeURIComponent("' OR 1=1 --"), null, v)).data.pagination.total, 0);
            await request('DELETE', '/post/' + literal._id, null, o);
        });
        await t.test('cancelled interactions keep exactly one event per actual state change', async () => {
            const before = (await request('GET', '/user/activity', null, v)).data.activity;
            for (let i = 0; i < 2; i++) {
                assert.equal((await request('DELETE', '/like/delete-like-post', { postId: post._id }, v)).status, 200);
                assert.equal((await request('DELETE', '/post/' + post._id + '/save', null, v)).status, 200);
                assert.equal((await request('POST', '/user/delete-follow', { userId: ownerId }, v)).status, 200);
            }
            const activity = (await request('GET', '/user/activity', null, v)).data.activity;
            for (const type of ['UNLIKE', 'UNSAVE', 'UNFOLLOW']) assert.equal(activity.filter(e => e.type === type).length, before.filter(e => e.type === type).length + 1);
            for (const type of ['LIKE', 'SAVE', 'FOLLOW']) assert.equal(activity.filter(e => e.type === type).length, before.filter(e => e.type === type).length);
            assert.equal((await request('GET', '/post/' + post._id, null, v)).data.post.likes.length, 0);
            assert.equal((await request('GET', '/post/' + post._id, null, v)).data.post.isSaved, false);
        });
        await t.test('relation lists and all private-post endpoints enforce membership', async () => {
            const group = (await request('POST', '/groups', { name: 'Friends' }, o)).data.group;
            assert.equal((await request('POST', '/groups/' + group.id + '/members', { userId: viewerId }, v)).status, 404);
            const privatePost = (await request('POST', '/post/create-post', { content: 'Friends only', mediaUrl: 'https://example.com/private.jpg', visibility: 'group', groupId: group.id }, o)).data.post;
            assert(privatePost);
            assert.equal((await request('GET', '/post/' + privatePost._id, null, v)).status, 404);
            assert.equal((await request('GET', '/search?scope=posts&q=Friends', null, v)).data.postsList.some(p => p._id === privatePost._id), false);
            assert.equal((await request('GET', '/search?scope=posts&q=Friends')).data.postsList.some(p => p._id === privatePost._id), false);
            assert.equal((await request('GET', '/post/' + privatePost._id)).status, 404);
            assert.equal((await request('GET', '/post/feed', null, v)).data.postsList.some(p => p._id === privatePost._id), false);
            assert.equal((await request('GET', '/post/recommended', null, v)).data.postsList.some(p => p._id === privatePost._id), false);
            assert.equal((await request('GET', '/user/get-profile?_id=' + ownerId, null, v)).data.profile.posts.some(p => p._id === privatePost._id), false);
            assert.equal((await request('POST', '/like/create-like-post', { postId: privatePost._id }, v)).status, 404);
            await request('POST', '/user/create-follow', { userId: viewerId }, o);
            await request('POST', '/groups/' + group.id + '/members', { userId: viewerId }, o);
            assert.equal((await request('GET', '/post/' + privatePost._id, null, v)).status, 200);
            assert.equal((await request('GET', '/search?scope=posts&q=Friends', null, v)).data.postsList.some(p => p._id === privatePost._id), true);
            assert.equal((await request('POST', '/comment/create-comment', { postId: privatePost._id, content: 'A private comment' }, v)).status, 201);
            assert.equal((await request('GET', '/comment/get-comments?postId=' + privatePost._id, null, v)).status, 200);
            assert.equal((await request('GET', '/comment/get-comments?postId=' + privatePost._id)).status, 404);
            assert.equal((await request('POST', '/post/' + privatePost._id + '/save', null, v)).status, 200);
            const privateImage = (await request('POST', '/post/create-post', { caption: 'Private media', visibility: 'group', groupId: group.id, photoVideoList: [{ type: 'PHOTO', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6zQAAAABJRU5ErkJggg==' }] }, o)).data.post;
            const mediaUrl = 'http://127.0.0.1:18000' + new URL(privateImage.photoVideo[0].url).pathname;
            assert.equal((await fetch(mediaUrl)).status, 404);
            assert.equal((await fetch(mediaUrl, { headers: { Authorization: 'Bearer ' + v } })).status, 200);
            await request('DELETE', '/groups/' + group.id + '/members/' + viewerId, null, o);
            assert.equal((await request('GET', '/post/' + privatePost._id, null, v)).status, 404);
            assert.equal((await request('GET', '/search?scope=posts&q=Friends', null, v)).data.postsList.some(p => p._id === privatePost._id), false);
            assert.equal((await request('GET', '/search?scope=posts&q=Friends')).data.postsList.some(p => p._id === privatePost._id), false);
            assert.equal((await fetch(mediaUrl, { headers: { Authorization: 'Bearer ' + v } })).status, 404);
            await request('DELETE', '/post/' + privateImage._id, null, o);
            assert.equal((await request('GET', '/user/get-profile?_id=' + viewerId, null, v)).data.profile.saved.some(p => p._id === privatePost._id), false);
            assert.equal((await request('DELETE', '/groups/' + group.id, null, o)).status, 409);
            await request('DELETE', '/post/' + privatePost._id, null, o);
            assert.equal((await request('DELETE', '/groups/' + group.id, null, o)).status, 200);
        });
        await t.test('Stories expire, Reels filter video, uploads validate and clean up', async () => {
            const story = (await request('POST', '/post/create-post', { caption: 'Temporary story', kind: 'STORY', photoVideoList: [{ type: 'PHOTO', url: 'https://example.com/story.png' }] }, o)).data.post;
            assert.equal((await request('GET', '/post/stories', null, v)).data.postsList.some(p => p._id === story._id), true);
            assert.equal((await request('GET', '/post/feed', null, v)).data.postsList.some(p => p._id === story._id), false);
            const testClient = new Client({ connectionString: source.href });
            await testClient.connect();
            await testClient.query('UPDATE posts SET expires_at=now()-$2::interval WHERE id=$1', [story._id, '1 hour']);
            await testClient.end();
            assert.equal((await request('GET', '/post/stories', null, v)).data.postsList.some(p => p._id === story._id), false);
            assert.equal((await request('GET', '/post/' + story._id, null, v)).status, 404);
            assert.equal((await request('GET', '/post/reels', null, v)).data.postsList.some(p => p._id === post._id), true);
            const removableStory = (await request('POST', '/post/create-post', { caption: 'Story to delete', kind: 'STORY', photoVideoList: [{ type: 'PHOTO', url: 'https://example.com/removable-story.png' }] }, o)).data.post;
            assert.equal((await request('DELETE', '/post/' + removableStory._id, null, v)).status, 403);
            assert.equal((await request('DELETE', '/post/' + removableStory._id, null, o)).status, 200);
            assert.equal((await request('GET', '/post/' + removableStory._id, null, o)).status, 404);
            const removableReel = (await request('POST', '/post/create-post', { caption: 'Video post to delete', photoVideoList: [{ type: 'VIDEO', url: 'https://example.com/removable-reel.webm' }] }, o)).data.post;
            assert.equal((await request('DELETE', '/post/' + removableReel._id, null, v)).status, 403);
            assert.equal((await request('DELETE', '/post/' + removableReel._id, null, o)).status, 200);
            assert.equal((await request('GET', '/post/' + removableReel._id, null, o)).status, 404);
            assert.equal((await request('POST', '/post/create-post', { caption: 'Invalid image', photoVideoList: [{ type: 'PHOTO', url: 'data:image/png;base64,bm90IGFuIGltYWdl' }] }, o)).status, 400);
            const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6zQAAAABJRU5ErkJggg==';
            const upload = await request('POST', '/post/create-post', { caption: 'Tiny test image', photoVideoList: [{ type: 'PHOTO', url: png }] }, o);
            assert.equal(upload.status, 201);
            const media = new URL(upload.data.post.photoVideo[0].url);
            const local = 'http://127.0.0.1:18000' + media.pathname;
            assert.equal((await fetch(local)).status, 200);
            await request('DELETE', '/post/' + upload.data.post._id, null, o);
            assert.equal((await fetch(local)).status, 404);
        });

        await t.test('public browsing and comment replies respect post visibility', async () => {
            const created = await request('POST', '/post/create-post', { content: 'Public reply QA', mediaUrl: 'https://example.com/replies.jpg' }, o);
            assert.equal(created.status, 201);
            const item = created.data.post;
            assert.equal((await request('GET', '/user/get-profile?_id=' + ownerId)).status, 200);
            assert.equal((await request('GET', '/post/explore')).status, 200);
            assert.equal((await request('GET', '/post/reels')).status, 200);
            assert.equal((await request('GET', '/post/stories')).status, 200);
            const root = await request('POST', '/comment/create-comment', { postId: item._id, content: 'Root comment' }, v);
            assert.equal(root.status, 201);
            const reply = await request('POST', '/comment/create-comment', { postId: item._id, parentCommentId: root.data.comment._id, content: 'Reply QA' }, o);
            assert.equal(reply.status, 201);
            assert.equal(reply.data.comment.parentCommentId, root.data.comment._id);
            const likeUrl = '/comment/' + root.data.comment._id + '/like';
            assert.equal((await request('POST', likeUrl, {}, o)).status, 201);
            assert.equal((await request('POST', likeUrl, {}, o)).status, 200);
            const comments = await request('GET', '/comment/get-comments?postId=' + item._id);
            assert.equal(comments.status, 200);
            assert.equal(comments.data.comments.find(c => c._id === root.data.comment._id).likes.length, 1);
            assert.equal((await request('GET', '/post/' + item._id)).data.post.likes.length, 0);
            assert.equal((await request('POST', likeUrl)).status, 401);
            assert.equal((await request('POST', '/comment/create-comment', { postId: post._id, parentCommentId: root.data.comment._id, content: 'Wrong post' }, v)).status, 400);
            const group = (await request('POST', '/groups', { name: 'Reply QA private' }, o)).data.group;
            assert.equal((await request('PATCH', '/post/' + item._id, { visibility: 'group', groupId: group.id }, o)).status, 200);
            assert.equal((await request('GET', '/post/' + item._id)).status, 404);
            assert.equal((await request('POST', likeUrl, {}, v)).status, 404);
            assert.equal((await request('POST', '/comment/create-comment', { postId: item._id, parentCommentId: root.data.comment._id, content: 'Forbidden reply' }, v)).status, 404);
            assert.equal((await request('PATCH', '/post/' + item._id, { visibility: 'public' }, o)).status, 200);
            assert.equal((await request('DELETE', likeUrl, null, o)).status, 200);
            assert.equal((await request('GET', '/comment/get-comments?postId=' + item._id)).data.comments.find(c => c._id === root.data.comment._id).likes.length, 0);
            assert.equal((await request('DELETE', '/post/' + item._id, null, o)).status, 200);
            assert.equal((await request('DELETE', '/groups/' + group.id, null, o)).status, 200);
        });

        await t.test('bootstraps one admin from the operator CLI and enables normal admin login', async () => {
            const password = 'Admin integration phrase 42!';
            function bootstrap(username, email, input = password) {
                return new Promise((resolve, reject) => {
                    const child = spawn(process.execPath, [
                        'scripts/bootstrap-admin.cjs', '--username', username, '--email', email, '--full-name', 'Integration Admin',
                    ], { env, stdio: ['pipe', 'pipe', 'pipe'] });
                    let output = '';
                    child.stdout.on('data', chunk => { output += chunk; });
                    child.stderr.on('data', chunk => { output += chunk; });
                    child.on('error', reject);
                    child.on('close', code => resolve({ code, output }));
                    child.stdin.end(input + '\n');
                });
            }
            const weakPassword = await bootstrap('insecure-admin', 'insecure-admin@example.com', 'secret');
            assert.equal(weakPassword.code, 1);
            assert.match(weakPassword.output, /at least 12 characters/);
            assert(!weakPassword.output.includes('secret'));
            const duplicateEmail = await bootstrap('duplicate-admin', 'owner@example.com');
            assert.equal(duplicateEmail.code, 1);
            assert.match(duplicateEmail.output, /already in use/);

            const candidates = ['bootstrap-one@example.com', 'bootstrap-two@example.com'];
            const attempts = await Promise.all(candidates.map((email, index) => bootstrap('bootstrap-admin-' + index, email)));
            assert.deepEqual(attempts.map(attempt => attempt.code).sort(), [0, 1]);
            assert.match(attempts.find(attempt => attempt.code === 1).output, /active admin already exists/);
            assert(attempts.every(attempt => !attempt.output.includes(password)));
            const createdEmail = candidates[attempts.findIndex(attempt => attempt.code === 0)];
            const adminLogin = await request('POST', '/auth/login', { email: createdEmail, password });
            assert.equal(adminLogin.status, 200);
            assert.equal(adminLogin.data.userInfo.role.name, 'admin');
            const consoleLogin = await request('POST', '/auth/admin/login', { email: createdEmail, password });
            assert.equal(consoleLogin.status, 200);
            assert.equal(consoleLogin.data.userInfo.role.name, 'admin');
            const wrongPassword = await request('POST', '/auth/admin/login', { email: createdEmail, password: 'incorrect' });
            assert.equal(wrongPassword.status, 401);
            assert.equal(wrongPassword.data.accessToken, undefined);
            const ordinaryLogin = await fetch(api + '/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'viewer@example.com', password: '12345678' }),
            });
            assert.equal(ordinaryLogin.status, 403);
            assert.equal(ordinaryLogin.headers.get('set-cookie'), null);
            assert.equal((await ordinaryLogin.json()).accessToken, undefined);
            const adminToken = consoleLogin.data.accessToken;
            assert.equal((await request('GET', '/admin/reports', null, adminToken)).status, 200);
            const log = await request('GET', '/admin/actions', null, adminToken);
            assert.equal(log.data.actions.filter(entry => entry.action === 'BOOTSTRAP_ADMIN').length, 1);
            assert.equal(log.data.actions[0].targetUserId, adminLogin.data.userInfo._id);
        });

        await t.test('roles, analytics and moderation cannot be invoked by ordinary users', async () => {
            assert.equal((await request('GET', '/admin/reports', null, v)).status, 403);
            assert.equal((await request('GET', '/creator/analytics', null, v)).status, 403);
            assert.equal((await request('POST', '/user/become-creator', {}, v)).status, 200);
            assert.equal((await request('GET', '/creator/analytics', null, v)).status, 200);
            const report = await request('POST', '/reports', { postId: post._id, reason: 'Integration moderation report' }, v);
            assert.equal(report.status, 201);
            assert.equal((await request('PATCH', '/admin/reports/' + report.data.report.id, { action: 'hide-post' }, v)).status, 403);
            const testClient = new Client({ connectionString: source.href });
            await testClient.connect();
            await testClient.query("UPDATE users SET role_id=(SELECT id FROM roles WHERE name='admin') WHERE id=$1", [ownerId]);
            await testClient.end();
            assert.equal((await request('GET', '/admin/reports', null, o)).status, 200);
            const disabledTarget = (await request('POST', '/auth/register', { email: 'disabled@example.com', fullName: 'Disabled User', username: 'disabled_user', password: 'Disabled123', confirmPassword: 'Disabled123' })).data.data;
            assert.equal((await request('PATCH', '/admin/users/' + disabledTarget._id, { disabled: true }, o)).status, 200);
            assert.equal((await request('POST', '/user/create-follow', { userId: disabledTarget._id }, v)).status, 404);
            assert.equal((await request('POST', '/user/delete-follow', { userId: disabledTarget._id }, v)).status, 404);
            assert.equal((await request('GET', '/user/get-profile?_id=' + disabledTarget._id, null, v)).status, 404);
            assert.equal((await request('GET', recipientUrl + disabledTarget._id, null, v)).status, 404);
            assert.equal((await emit({ receiverId: disabledTarget._id, contents: 'Unavailable recipient' })).status, 404);
            assert.equal((await request('GET', '/user/get-suggested-users', null, v)).data.users.some(user => user._id === disabledTarget._id), false);
            assert.equal((await request('PATCH', '/admin/users/' + ownerId, { disabled: true }, o)).status, 400);
            const flagged = (await request('POST', '/post/create-post', { content: 'Moderation test', mediaUrl: 'https://example.com/flagged.jpg' }, v)).data.post;
            const flag = (await request('POST', '/reports', { postId: flagged._id, reason: 'Test moderation action' }, o)).data.report;
            assert.equal((await request('PATCH', '/admin/reports/' + flag.id, { action: 'hide-post', resolution: 'Reviewed and hid the reported post.' }, o)).status, 200);
            assert.equal((await request('GET', '/post/' + flagged._id, null, v)).status, 404);
            assert.equal((await request('GET', '/search?scope=posts&q=Moderation', null, v)).data.postsList.some(p => p._id === flagged._id), false);
        });

        await t.test('profile updates retain roles and admin audit endpoints enforce permissions', async () => {
            assert.equal((await request('GET', '/admin/stats', null, v)).status, 403);
            assert.equal((await request('GET', '/admin/actions', null, v)).status, 403);
            const stats = await request('GET', '/admin/stats', null, o);
            assert.equal(stats.status, 200);
            assert.equal(Object.hasOwn(stats.data, 'messages'), false);
            const actions = await request('GET', '/admin/actions', null, o);
            assert.equal(actions.status, 200);
            assert(actions.data.actions.some(action => action.action === 'UPDATE_USER'));
            assert(actions.data.actions.some(action => action.action === 'RESOLVE_REPORT'));
            for (const endpoint of ['/user/me', '/user/profile']) {
                const update = await request('PATCH', endpoint, { fullName: 'Owner QA' }, o);
                assert.equal(update.status, 200);
                assert.equal(update.data.userInfo.role.name, 'admin');
            }
            assert.equal((await request('PATCH', '/user/me', { email: 'VIEWER@example.com' }, o)).status, 409);
            assert.equal((await request('PATCH', '/user/me', { username: 'VIEWER' }, o)).status, 409);
        });

        await t.test('publishing without captions separates Reels and enforces one video', async () => {
            const reel = await request('POST', '/post/create-post', { kind: 'REEL', photoVideoList: [{ type: 'VIDEO', url: 'https://example.com/new-reel.webm' }] }, v);
            assert.equal(reel.status, 201);
            assert.equal(reel.data.post.caption, '');
            assert.equal(reel.data.post.kind, 'REEL');
            const id = reel.data.post._id;
            assert((await request('GET', '/post/reels')).data.postsList.some(p => p._id === id));
            assert(!(await request('GET', '/post/explore')).data.postsList.some(p => p._id === id));
            const profile = (await request('GET', '/user/get-profile?_id=' + viewerId, null, v)).data.profile;
            assert(profile.reels.some(p => p._id === id));
            assert(!profile.posts.some(p => p._id === id));
            for (const media of [[{ type: 'PHOTO', url: 'https://example.com/a.png' }], [{ type: 'VIDEO', url: 'https://example.com/a.webm' }, { type: 'VIDEO', url: 'https://example.com/b.webm' }]]) {
                assert.equal((await request('POST', '/post/create-post', { kind: 'REEL', photoVideoList: media }, v)).status, 400);
            }
            await request('DELETE', '/post/' + id, null, v);
        });

        await t.test('group membership follows eligible accounts and is revoked on unfollow', async () => {
            await request('POST', '/user/delete-follow', { userId: viewerId }, o);
            const group = (await request('POST', '/groups', { name: 'Follow only QA' }, o)).data.group;
            assert.equal((await request('POST', '/groups/' + group.id + '/members', { userId: ownerId }, o)).status, 400);
            assert.equal((await request('POST', '/groups/' + group.id + '/members', { userId: viewerId }, o)).status, 400);
            await request('POST', '/user/create-follow', { userId: viewerId }, o);
            assert((await request('GET', '/groups/eligible-members', null, o)).data.users.some(u => u._id === viewerId));
            assert.equal((await request('POST', '/groups/' + group.id + '/members', { userId: viewerId }, o)).status, 200);
            const shared = (await request('POST', '/post/create-post', { visibility: 'group', groupId: group.id, mediaUrl: 'https://example.com/shared.png' }, o)).data.post;
            assert.equal((await request('GET', '/post/' + shared._id, null, v)).status, 200);
            await request('POST', '/user/delete-follow', { userId: viewerId }, o);
            assert.equal((await request('GET', '/post/' + shared._id, null, v)).status, 404);
            assert(!(await request('GET', '/groups/eligible-members', null, o)).data.users.some(u => u._id === viewerId));
            await request('DELETE', '/post/' + shared._id, null, o);
            await request('DELETE', '/groups/' + group.id, null, o);
        });

        await t.test('date filters, concurrent duplicate reports and audited moderation work', async () => {
            for (const endpoint of ['/admin/stats', '/creator/analytics']) {
                assert.equal((await request('GET', endpoint + '?from=2026-01-01&to=2026-12-31', null, o)).status, 200);
                assert.equal((await request('GET', endpoint + '?from=2026-02-30', null, o)).status, 400);
                assert.equal((await request('GET', endpoint + '?from=2026-12-31&to=2026-01-01', null, o)).status, 400);
            }
            assert.equal((await request('GET', '/admin/content', null, v)).status, 403);
            const item = (await request('POST', '/post/create-post', { caption: 'New moderation QA', mediaUrl: 'https://example.com/report32.png' }, o)).data.post;
            const analytics = await request('GET', '/creator/analytics?postId=' + item._id, null, o);
            assert.equal(analytics.status, 200);
            assert.deepEqual(analytics.data.posts.map(post => post.id), [item._id]);
            assert.deepEqual(analytics.data.posts[0].preview, { type: 'PHOTO', url: 'https://example.com/report32.png' });
            assert.deepEqual((await request('GET', '/creator/analytics?postId=' + item._id, null, v)).data.posts, []);
            const body = { postId: item._id, reason: 'Duplicate moderation QA' };
            const reports = await Promise.all(Array.from({ length: 4 }, () => request('POST', '/reports', body, v)));
            assert(reports.every(r => [200, 201].includes(r.status)));
            assert.equal(new Set(reports.map(r => r.data.report.id)).size, 1);
            const id = reports[0].data.report.id;
            assert.equal((await request('PATCH', '/admin/reports/' + id, { action: 'dismiss', resolution: 'Reviewed; no violation found.' }, o)).status, 200);
            assert.equal((await request('PATCH', '/admin/reports/' + id, { action: 'hide-post', resolution: 'Repeated decision must fail.' }, o)).status, 409);
            const notifications = (await request('GET', '/notification/get-all', null, v)).data.notifications;
            const notice = notifications.find(n => n.type === 'REPORT_RESOLVED' && n.postId === item._id);
            assert(notice);
            assert.equal((await request('PATCH', '/notification/' + notice._id + '/read', {}, o)).status, 404);
            assert.equal((await request('PATCH', '/notification/' + notice._id + '/read', {}, v)).status, 200);
            const content = await request('GET', '/admin/content?q=' + item._id, null, o);
            assert.equal(content.data.postsList.length, 1);
            for (const action of ['hide', 'keep']) {
                assert.equal((await request('PATCH', '/admin/content/' + item._id + '/moderate', { action, resolution: 'QA audited content decision.' }, o)).status, 200);
                assert.equal((await request('GET', '/post/' + item._id)).status, action === 'hide' ? 404 : 200);
            }
            const actions = (await request('GET', '/admin/actions', null, o)).data.actions;
            assert(actions.some(a => a.action === 'MODERATE_CONTENT' && a.details.postId === item._id));
            await request('DELETE', '/post/' + item._id, null, o);
        });

        await t.test('password recovery is single-use and revokes existing sessions', async () => {
            assert.equal((await request('POST', '/auth/forgot-password', { email: viewer.userInfo.email })).status, 200);
            assert.equal(mailbox.length, 1);
            const token = mailbox[0].text.match(/token=([a-f0-9]{64})/)[1];
            assert.equal((await request('POST', '/auth/reset-password', { token, password: 'NewTestPass123' })).status, 200);
            assert.equal((await request('POST', '/auth/reset-password', { token, password: 'OtherTestPass123' })).status, 400);
            assert.equal((await request('GET', '/auth/me', null, v)).status, 401);
            assert.equal((await request('POST', '/auth/login', { email: 'viewer@example.com', password: '12345678' })).status, 401);
            assert.equal((await request('POST', '/auth/login', { email: 'viewer@example.com', password: 'NewTestPass123' })).status, 200);
        });
        assert.equal((await request('DELETE', '/post/' + post._id, null, o)).status, 200);
        assert.equal((await request('GET', '/post/' + post._id)).status, 404);
        assert.equal((await request('GET', '/comment/get-comments?postId=' + post._id)).status, 404);
        assert.equal(errors.includes('Unhandled'), false);
    }
    finally {
        socket1?.close();
        socket2?.close();
        if (mailServer)
            await new Promise(resolve => mailServer.close(resolve));
        if (server) {
            server.kill();
            await new Promise(r => server.once('exit', r));
        }
        await admin.query('DROP DATABASE "' + db + '" WITH (FORCE)');
        await admin.end();
    }
});
