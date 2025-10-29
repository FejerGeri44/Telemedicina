const express = require('express');
const router = express.Router();
const sharedController = require('../controllers/shared.controller');
const { authGuard } = require('../middleware/auth.guard');

router.post('/sendMessage', authGuard, sharedController.sendMessage);
router.post('/getMyMessages', authGuard, sharedController.getMyMessages);
router.post('/deleteConversation', authGuard, sharedController.deleteConversation);
router.post('/mark-conversation-as-read', authGuard, sharedController.markConversationAsRead);
router.post('/getUnreadMessages', authGuard, sharedController.getUnreadMessages);
router.post('/system-messages-for-me', authGuard, sharedController.getSystemMessagesForMe);

module.exports = router;
