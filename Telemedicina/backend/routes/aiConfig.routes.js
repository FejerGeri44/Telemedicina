const express = require('express');
const router = express.Router();
const aiConfigController = require('../controllers/aiConfig.controller');
const authenticateToken = require('../middleware/firebaseAuth');

router.get('/ai-config/patient-assistant', authenticateToken, aiConfigController.getPatientAssistantConfig);
router.get('/ai-config/doctor-assistant', authenticateToken, aiConfigController.getDoctorAssistantConfig);
router.post('/ai-config/ai-rules/update', authenticateToken, aiConfigController.updateAiRules);
router.post('/ai-config/ai-rules/create', authenticateToken, aiConfigController.createIntent);
router.post('/ai-config/ai-rules/delete', authenticateToken, aiConfigController.deleteAiRule);

module.exports = router;
