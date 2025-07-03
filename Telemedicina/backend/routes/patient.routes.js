const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/doctors', patientController.getAllDoctors);
router.patch('/profile/update', patientController.updateProfile);
router.get('/me', authenticateToken, patientController.getCurrentUser);

module.exports = router;
