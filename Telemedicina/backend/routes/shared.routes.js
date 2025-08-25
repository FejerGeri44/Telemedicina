const express = require('express');
const router = express.Router();
const sharedController = require('../controllers/shared.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.post('/sendMessage', authenticateToken, sharedController.sendMessage);
router.post('/getMyMessages', authenticateToken, sharedController.getMyMessages);
router.post('/deleteConversation', authenticateToken, sharedController.deleteConversation);

module.exports = router;
