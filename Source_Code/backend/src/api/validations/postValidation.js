const Joi = require("joi");

exports.createPostSchema = Joi.object({
    content: Joi.string().trim().min(1).max(2200).required(),
    mediaUrl: Joi.string()
        .trim()
        .uri({ scheme: ["http", "https"] })
        .required(),
});

exports.feedQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
});

exports.postIdParamSchema = Joi.object({
    postId: Joi.string().uuid().required(),
});
