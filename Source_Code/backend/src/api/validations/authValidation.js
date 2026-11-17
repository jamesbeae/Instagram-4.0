const Joi = require("joi");

// Sign up validation:
exports.signUpSchema = Joi.object({
    email: Joi.string()
        .email({
            minDomainSegments: 2,
            tlds: { allow: ["com", "net"] },
        })
        .required(),
    fullName: Joi.string().min(3).max(100).required(),
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string()
        .pattern(new RegExp("^[a-zA-Z0-9]{8,30}$"))
        .required(),
});

// Login validation:
exports.loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
});

// Logout validation:
exports.logoutSchema = Joi.object({
    _id: Joi.string().uuid(),
    username: Joi.string(),
}).or("_id", "username");
