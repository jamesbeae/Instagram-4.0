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
        const owner = (await request('POST', '/auth/login', { username: 'owner', password: '12345678' })).data;
        const viewer = (await request('POST', '/auth/login', { username: 'viewer', password: '12345678' })).data;
        assert(owner.accessToken);
        assert(viewer.accessToken);
        const o = owner.accessToken, v = viewer.accessToken, ownerId = owner.userInfo._id, viewerId = viewer.userInfo._id;
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
        const comment = await request('POST', '/comment/create-comment', { postId: post._id, content: 'A comment' }, v);
        assert.equal(comment.status, 201);
        assert.equal(comment.data.comment.userId._id, viewerId);
        assert.equal((await request('GET', '/comment/get-comments?postId=' + post._id)).data.comments.length, 1);
        assert.equal((await request('POST', '/post/' + post._id + '/save', null, v)).status, 200);
        assert.equal((await request('GET', '/post/' + post._id, null, v)).data.post.isSaved, true);
        assert.equal((await request('GET', '/user/get-profile?_id=' + viewerId, null, v)).data.profile.saved.length, 1);
        assert.equal((await request('GET', '/user/get-profile?_id=' + viewerId, null, o)).data.profile.saved.length, 0);
        assert.equal((await request('POST', '/user/create-follow', { userId: ownerId }, v)).status, 200);
        assert.equal((await request('GET', '/user/get-suggested-users', null, v)).data.users.some(u => u._id === ownerId), false);
        assert.equal((await request('GET', '/notification/get-all', null, o)).data.notifications.length, 3);
        assert.equal((await request('GET', '/message?sender_id=' + viewerId + '&receiver_id=' + ownerId, null, o)).status, 403);
        assert.equal((await request('GET', '/user/get-profile?_id=invalid', null, o)).status, 400);
        assert.equal((await request('POST', '/post/' + post._id + '/interaction', { type: 'VIEW' }, v)).status, 201);
        await request('POST', '/post/' + post._id + '/interaction', { type: 'VIEW' }, v);
        assert.equal((await request('GET', '/user/activity', null, v)).data.activity.filter(x => x.type === 'VIEW').length, 1);
        assert.equal((await request('PATCH', '/user/me', { fullName: 'Changed viewer', bio: 'Integration test' }, v)).status, 200);
        const { io } = require('../../frontend/node_modules/socket.io-client');
        const connect = token => new Promise((resolve, reject) => { const socket = io('http://127.0.0.1:18000', { auth: { token }, reconnection: false, timeout: 3000 }); socket.once('connect', () => resolve(socket)); socket.once('connect_error', e => { socket.close(); reject(e); }); });
        await assert.rejects(connect('invalid'));
        socket1 = await connect(v);
        socket2 = await connect(o);
        const emit = payload => new Promise((resolve, reject) => socket1.timeout(5000).emit('sendMessage', payload, (err, r) => err ? reject(err) : resolve(r)));
        assert.equal((await emit({ senderId: ownerId, receiverId: ownerId, contents: 'Forged sender' })).status, 403);
        const receive = new Promise(resolve => socket2.once('receiveMessage', resolve));
        const sent = await emit({ receiverId: ownerId, contents: 'Realtime message' });
        assert.equal(sent.ok, true);
        assert.equal((await receive).sender_id, viewerId);
        const history = await request('GET', '/message?receiver_id=' + viewerId, null, o);
        assert.equal(history.data.length, 1);
        assert.equal(history.data[0]._id, sent.message._id);
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
            for (let i = 0; i < 2; i++) {
                assert.equal((await request('DELETE', '/like/delete-like-post', { postId: post._id }, v)).status, 200);
                assert.equal((await request('DELETE', '/post/' + post._id + '/save', null, v)).status, 200);
                assert.equal((await request('POST', '/user/delete-follow', { userId: ownerId }, v)).status, 200);
            }
            const activity = (await request('GET', '/user/activity', null, v)).data.activity;
            for (const type of ['UNLIKE', 'UNSAVE', 'UNFOLLOW']) assert.equal(activity.filter(e => e.type === type).length, 1);
            for (const type of ['LIKE', 'SAVE', 'FOLLOW']) assert.equal(activity.filter(e => e.type === type).length, 1);
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
            assert.equal((await request('PATCH', '/admin/users/' + ownerId, { disabled: true }, o)).status, 400);
            const flagged = (await request('POST', '/post/create-post', { content: 'Moderation test', mediaUrl: 'https://example.com/flagged.jpg' }, v)).data.post;
            const flag = (await request('POST', '/reports', { postId: flagged._id, reason: 'Test moderation action' }, o)).data.report;
            assert.equal((await request('PATCH', '/admin/reports/' + flag.id, { action: 'hide-post' }, o)).status, 200);
            assert.equal((await request('GET', '/post/' + flagged._id, null, v)).status, 404);
            assert.equal((await request('GET', '/search?scope=posts&q=Moderation', null, v)).data.postsList.some(p => p._id === flagged._id), false);
        });
        await t.test('password recovery is single-use and revokes existing sessions', async () => {
            assert.equal((await request('POST', '/auth/forgot-password', { email: viewer.userInfo.email })).status, 200);
            assert.equal(mailbox.length, 1);
            const token = mailbox[0].text.match(/token=([a-f0-9]{64})/)[1];
            assert.equal((await request('POST', '/auth/reset-password', { token, password: 'NewTestPass123' })).status, 200);
            assert.equal((await request('POST', '/auth/reset-password', { token, password: 'OtherTestPass123' })).status, 400);
            assert.equal((await request('GET', '/auth/me', null, v)).status, 401);
            assert.equal((await request('POST', '/auth/login', { username: 'viewer', password: '12345678' })).status, 401);
            assert.equal((await request('POST', '/auth/login', { username: 'viewer', password: 'NewTestPass123' })).status, 200);
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
