const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/getDoctorMe', authenticateToken, doctorController.getCurrentUser);

module.exports = router;
