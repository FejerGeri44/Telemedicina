const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages.controller');
const { authGuard } = require('../middleware/auth.guard');

router.post('/create', authGuard, messagesController.create);
router.post('/conversation', authGuard, messagesController.conversation);
router.post('/deleteConversation', authGuard, messagesController.deleteConversation);
router.get('/unreadSummary', authGuard, messagesController.getUnreadSummary);
router.post('/markConversationAsRead', authGuard, messagesController.markConversationAsRead);
router.post('/system-messages-for-me', authGuard, messagesController.getSystemMessagesForMe);

module.exports = router;
