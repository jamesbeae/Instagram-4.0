const Joi = require("joi");
exports.createPostSchema = Joi.object({
    kind: Joi.string().valid('POST', 'STORY').default('POST'),
    visibility: Joi.string().valid('public', 'followers', 'group').default('public'),
    groupId: Joi.when('visibility', { is: 'group', then: Joi.string().uuid().required(), otherwise: Joi.forbidden() }),
    content: Joi.string().trim().min(1).max(2200),
    caption: Joi.string().trim().min(1).max(2200),
    mediaUrl: Joi.string().uri({ scheme: ['http', 'https'] }),
    photoVideoList: Joi.array().min(1).max(10).items(Joi.object({ url: Joi.string().max(28000000).required(), type: Joi.string().valid('PHOTO', 'VIDEO').required(), _id: Joi.string() }))
}).xor('content', 'caption').xor('mediaUrl', 'photoVideoList');
exports.feedQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
});
exports.postIdParamSchema = Joi.object({
    postId: Joi.string().uuid().required(),
});
