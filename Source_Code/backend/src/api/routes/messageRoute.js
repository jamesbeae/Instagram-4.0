const express = require("express");
const router = express.Router();
// const userController = require("../controllers/userController");
const messageController = require("../controllers/messageController");
const { verifyJWT } = require("../middlewares/verifyJWT");

router.get("/inbox", verifyJWT, messageController.getInbox);
router.get("/recipient", verifyJWT, messageController.getRecipient);
router.post("/read", verifyJWT, messageController.markRead);
router.get("", verifyJWT, messageController.getMessages);

module.exports = router;
