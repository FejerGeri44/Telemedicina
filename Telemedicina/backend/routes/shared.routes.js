const express = require('express');
const router = express.Router();
const sharedController = require('../controllers/shared.controller');
const authenticateToken = require('../middleware/firebaseAuth');

router.post('/sendMessage', authenticateToken, sharedController.sendMessage);
router.post('/getMyMessages', authenticateToken, sharedController.getMyMessages);
router.post('/deleteConversation', authenticateToken, sharedController.deleteConversation);
router.post('/mark-conversation-as-read', authenticateToken, sharedController.markConversationAsRead);
router.post('/getUnreadMessages', authenticateToken, sharedController.getUnreadMessages);
router.post('/system-messages-for-me', authenticateToken, sharedController.getSystemMessagesForMe);

module.exports = router;
