const Joi = require("joi");
exports.createPostSchema = Joi.object({
    kind: Joi.string().valid('POST', 'STORY', 'REEL').default('POST'),
    visibility: Joi.string().valid('public', 'followers', 'group').default('public'),
    groupId: Joi.when('visibility', { is: 'group', then: Joi.string().uuid().required(), otherwise: Joi.forbidden() }),
    content: Joi.string().trim().max(2200),
    caption: Joi.string().trim().max(2200),
    mediaUrl: Joi.string().uri({ scheme: ['http', 'https'] }),
    photoVideoList: Joi.array().min(1).max(10).items(Joi.object({ url: Joi.string().max(28000000).required(), type: Joi.string().valid('PHOTO', 'VIDEO').required(), _id: Joi.string() }))
}).oxor('content', 'caption').xor('mediaUrl', 'photoVideoList').custom((value, helpers) => {
    const reelMediaValid = value.photoVideoList?.length === 1 && value.photoVideoList[0]?.type === 'VIDEO' || value.mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(value.mediaUrl);
    if (value.kind === 'REEL' && !reelMediaValid)
        return helpers.error('any.invalid', { message: 'A Reel must contain exactly one video' });
    return value;
});
exports.feedQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
});
exports.postIdParamSchema = Joi.object({
    postId: Joi.string().uuid().required(),
});
