const express = require("express");
const router = express.Router();
const {
    createPost,
    deletePost,
    getFeed,
    getPostDetail,
    updatePost,
} = require("../controllers/postController");
const { verifyJWT } = require("../middlewares/verifyJWT");
const {
    validateReqBody,
    validateReqParams,
    validateReqQuery,
} = require("../middlewares/validateReqBody");
const {
    createPostSchema,
    feedQuerySchema,
    postIdParamSchema,
    updatePostSchema,
} = require("../validations/postValidation");

// Create Post:
router.post(
    "/create-post",
    verifyJWT,
    validateReqBody(createPostSchema),
    createPost
);

router.get("/feed", validateReqQuery(feedQuerySchema), getFeed);

// Compatibility route used by the current frontend.
router.get(
    "/get-all-posts",
    validateReqQuery(feedQuerySchema),
    getFeed
);

router.get(
    "/:postId",
    validateReqParams(postIdParamSchema),
    getPostDetail
);

router.patch(
    "/:postId",
    verifyJWT,
    validateReqParams(postIdParamSchema),
    validateReqBody(updatePostSchema),
    updatePost
);

router.delete(
    "/:postId",
    verifyJWT,
    validateReqParams(postIdParamSchema),
    deletePost
);

module.exports = router;
