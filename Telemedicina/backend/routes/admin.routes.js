const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/getAdminMe', authenticateToken, adminController.getCurrentUser);

module.exports = router;
