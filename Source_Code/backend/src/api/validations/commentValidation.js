const Joi = require("joi");
//Create Comment Validation:
exports.createCommentValidation = Joi.object({
    postId: Joi.string().uuid().required(),
    content: Joi.string().trim().min(1).max(2200).required(),
});
