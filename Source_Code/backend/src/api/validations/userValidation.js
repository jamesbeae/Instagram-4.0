const Joi = require("joi");

exports.updateProfileSchema = Joi.object({
    username: Joi.string().trim().min(3).max(30).pattern(/^[a-zA-Z0-9._]+$/),
    email: Joi.string().trim().email().max(254),
    fullName: Joi.string().trim().min(3).max(120),

    bio: Joi.string().trim().allow("").max(500),

    avatarData: Joi.alternatives().try(
        Joi.string()
            .max(7000000)
            .pattern(
                /^data:image\/(png|jpeg|webp);base64,/
            )
            .messages({
                "string.pattern.base":
                    "Avatar must be a PNG, JPEG or WEBP image",
            }),
        Joi.valid(null)
    ),
}).min(1);
