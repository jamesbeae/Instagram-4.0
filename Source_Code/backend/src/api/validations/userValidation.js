const Joi = require("joi");

exports.updateProfileSchema = Joi.object({
    fullName: Joi.string().trim().min(3).max(120),

    bio: Joi.string().trim().allow("").max(500),

    avatarData: Joi.alternatives().try(
        Joi.string()
            .pattern(
                /^data:image\/(png|jpeg|jpg|webp);base64,/
            )
            .messages({
                "string.pattern.base":
                    "Avatar must be a PNG, JPEG or WEBP image",
            }),
        Joi.valid(null)
    ),
}).min(1);