const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateReqBody } = require("../middlewares/validateReqBody");
const { verifyJWT } = require("../middlewares/verifyJWT");
const {
    signUpSchema,
    loginSchema,
} = require("../validations/authValidation");

///////// user routers:
// Sign up router:
router.post("/sign-up", validateReqBody(signUpSchema), authController.signUp);
router.post("/register", validateReqBody(signUpSchema), authController.signUp);

// Log in router:
router.post("/login", validateReqBody(loginSchema), authController.login);

// Log in with Facebook router:
router.post("/login-with-facebook", authController.loginWithFacebook);

// Log out router:
router.post("/logout", verifyJWT, authController.logout);

// Refresh Access Token:
router.get("/refresh-access-token", authController.refreshAccessToken);

// Get current authenticated user:
router.get("/me", verifyJWT, authController.me);

module.exports = router;
