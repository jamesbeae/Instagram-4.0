const { StatusCodes } = require("http-status-codes");

exports.validateReqBody = (schema) => (req, res, next) => {
    const validationResult = schema.validate(req.body);
    if (validationResult.error) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: validationResult.error.details[0].message });
    }
    req.body = validationResult.value;
    next();
};

exports.validateReqQuery = (schema) => (req, res, next) => {
    const validationResult = schema.validate(req.query);
    if (validationResult.error) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: validationResult.error.details[0].message });
    }
    req.validatedQuery = validationResult.value;
    next();
};

exports.validateReqParams = (schema) => (req, res, next) => {
    const validationResult = schema.validate(req.params);
    if (validationResult.error) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: validationResult.error.details[0].message });
    }
    req.params = validationResult.value;
    next();
};
