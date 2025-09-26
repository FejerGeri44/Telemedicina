const express = require('express');
const router = express.Router();
const aiConfigController = require('../controllers/aiConfig.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/ai-config/patient-assistant', authenticateToken, aiConfigController.getPatientAssistantConfig);

module.exports = router;
