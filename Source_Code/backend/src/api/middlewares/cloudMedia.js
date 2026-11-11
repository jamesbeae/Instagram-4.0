const cloudinary = require('../../configs/cloudinary');
const { Readable } = require('node:stream');
module.exports = async (req, res, next) => {
    if (!req.mediaAsset?.publicId)
        return next();
    try {
        const m = req.mediaAsset;
        const url = cloudinary.url(m.publicId, { type: 'authenticated', resource_type: m.type === 'VIDEO' ? 'video' : 'image', secure: true, sign_url: true });
        const remote = await fetch(url, { headers: req.headers.range ? { Range: req.headers.range } : {}, signal: AbortSignal.timeout(30000) });
        if (!remote.ok)
            return res.sendStatus(remote.status === 404 ? 404 : 502);
        for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges'])
            if (remote.headers.has(header))
                res.set(header, remote.headers.get(header));
        res.set('Cache-Control', 'private, no-store');
        res.set('X-Content-Type-Options', 'nosniff');
        res.status(remote.status);
        const stream = Readable.fromWeb(remote.body);
        stream.on('error', () => res.destroy());
        stream.pipe(res);
    }
    catch {
        if (!res.headersSent)
            res.status(502).json({ message: 'Media unavailable' });
        else
            res.destroy();
    }
};
