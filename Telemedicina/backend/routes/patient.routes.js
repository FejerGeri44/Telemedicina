const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/doctors', patientController.getAllDoctors);
router.patch('/profile/update', patientController.updateProfile);
router.get('/getPatientMe', authenticateToken, patientController.getCurrentUser);
router.post('/getDoctorsAppointments', authenticateToken, patientController.getDoctorsAppointments);
router.post('/registerToAppointment', authenticateToken, patientController.registerToAppointment);
router.get('/loadMyAppointments', authenticateToken, patientController.loadMyAppointments);

module.exports = router;
