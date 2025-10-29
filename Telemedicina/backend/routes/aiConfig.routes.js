const express = require('express');
const router = express.Router();
const aiConfigController = require('../controllers/aiConfig.controller');
const { authGuard } = require('../middleware/auth.guard');

router.get('/ai-config/patient-assistant', authGuard, aiConfigController.getPatientAssistantConfig);
router.get('/ai-config/doctor-assistant', authGuard, aiConfigController.getDoctorAssistantConfig);
router.post('/ai-config/ai-rules/update', authGuard, aiConfigController.updateAiRules);
router.post('/ai-config/ai-rules/create', authGuard, aiConfigController.createIntent);
router.post('/ai-config/ai-rules/delete', authGuard, aiConfigController.deleteAiRule);

module.exports = router;
