const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/doctors', patientController.getAllDoctors);
router.patch('/patient/profile/update', patientController.updateProfile);
router.get('/getPatientMe', authenticateToken, patientController.getCurrentUser);
router.get('/getPatientMeTags', authenticateToken, patientController.getPatientMeTags);
router.post('/getDoctorsAppointments', authenticateToken, patientController.getDoctorsAppointments);
router.post('/patient/registerToAppointment', authenticateToken, patientController.registerToAppointment);
router.get('/loadMyAppointments', authenticateToken, patientController.loadMyAppointments);
router.post('/getDoctorCardData', authenticateToken, patientController.getDoctorCardData);
router.get('/loadMyRegisteredAppointments', authenticateToken, patientController.loadMyRegisteredAppointments);
router.patch('/patient/cancelAppointment', authenticateToken, patientController.cancelAppointment);
router.post('/doctorsRating', authenticateToken, patientController.rateDoctor);

module.exports = router;
