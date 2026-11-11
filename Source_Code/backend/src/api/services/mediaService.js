const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const cloudinary = require('../../configs/cloudinary');
const uploadDir = path.resolve(__dirname, '../../../uploads');
exports.uploadDir = uploadDir;
exports.avatarDir = path.join(uploadDir, 'avatars');
exports.prepareAvatar = async url => (await exports.prepareMedia([{ url, type: 'PHOTO' }], { avatar: true }))[0].url;
const configured = () => process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
const formats = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' };
exports.prepareMedia = async (items, { avatar = false } = {}) => {
    if (!Array.isArray(items) || items.length < 1 || items.length > 10)
        throw Object.assign(new Error('Choose 1–10 images or videos'), { status: 400 });
    // Validate all input before writing any media.
    const parsed = items.map(item => {
        if (!['PHOTO', 'VIDEO'].includes(item?.type) || typeof item.url !== 'string')
            throw Object.assign(new Error('Invalid media'), { status: 400 });
        if (/^https?:\/\//i.test(item.url)) {
            new URL(item.url);
            return item;
        }
        const match = item.url.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
        if (!match || !formats[match[1]] || item.type !== (match[1].startsWith('image/') ? 'PHOTO' : 'VIDEO'))
            throw Object.assign(new Error('Unsupported media format'), { status: 400 });
        const bytes = Buffer.from(match[2], 'base64');
        if (!bytes.length || bytes.length > (avatar ? 5 : 20) * 1024 * 1024)
            throw Object.assign(new Error('Media must be at most 20 MB'), { status: 400 });
        const valid = match[1] === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
            match[1] === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 :
                match[1] === 'image/gif' ? bytes.subarray(0, 3).toString() === 'GIF' :
                    match[1] === 'image/webp' ? bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' :
                        match[1] === 'video/mp4' ? bytes.subarray(4, 8).toString() === 'ftyp' : bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
        if (!valid)
            throw Object.assign(new Error('File contents do not match media format'), { status: 400 });
        return { ...item, bytes, extension: formats[match[1]] };
    });
    const saved = [];
    try {
        for (const item of parsed) {
            if (!item.bytes) {
                saved.push({ url: item.url, type: item.type });
                continue;
            }
            if (avatar) {
                if (configured()) {
                    const result = await cloudinary.uploader.upload(item.url, { resource_type: 'image', folder: 'instagram4/avatars', type: 'upload' });
                    return [{ url: result.secure_url }];
                }
                if (process.env.NODE_ENV === 'production') throw Object.assign(new Error('Cloudinary is required in production'), { status: 503 });
                const name = randomUUID() + '.' + item.extension;
                await fs.mkdir(exports.avatarDir, { recursive: true });
                await fs.writeFile(path.join(exports.avatarDir, name), item.bytes, { flag: 'wx' });
                return [{ url: (process.env.PUBLIC_API_URL || 'http://localhost:8000') + '/avatars/' + name }];
            }
            if (configured()) {
                const result = await cloudinary.uploader.upload(item.url, { resource_type: item.type === 'VIDEO' ? 'video' : 'image', folder: 'instagram4', type: 'authenticated' });
                const assetId = randomUUID() + '.' + item.extension;
                saved.push({ url: (process.env.PUBLIC_API_URL || 'http://localhost:8000') + '/uploads/' + assetId, type: item.type, publicId: result.public_id, assetId, deliveryType: 'authenticated' });
            }
            else {
                if (process.env.NODE_ENV === 'production')
                    throw Object.assign(new Error('Cloudinary is required in production'), { status: 503 });
                await fs.mkdir(uploadDir, { recursive: true });
                const name = randomUUID() + '.' + item.extension;
                await fs.writeFile(path.join(uploadDir, name), item.bytes, { flag: 'wx' });
                saved.push({ url: (process.env.PUBLIC_API_URL || 'http://localhost:8000') + '/uploads/' + name, type: item.type, localFile: name });
            }
        }
        return saved;
    }
    catch (e) {
        await exports.removeMedia(saved);
        throw e;
    }
};
exports.removeMedia = async (items) => {
    for (const item of items || []) {
        try {
            if (item.localFile && /^[0-9a-f-]+\.(jpg|png|webp|gif|mp4|webm)$/.test(item.localFile))
                await fs.unlink(path.join(uploadDir, item.localFile));
            if (item.publicId)
                await cloudinary.uploader.destroy(item.publicId, { resource_type: item.type === 'VIDEO' ? 'video' : 'image', type: item.deliveryType || 'upload' });
        }
        catch { /* A deleted post must remain deleted even if storage cleanup is unavailable. */ }
    }
};
