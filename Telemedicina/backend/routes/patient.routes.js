const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');

router.get('/doctors', patientController.getAllDoctors);

module.exports = router;
