const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/doctors', patientController.getAllDoctors);
router.patch('/profile/update', patientController.updateProfile);
router.get('/getPatientMe', authenticateToken, patientController.getCurrentUser);
router.get('/getPatientMeTags', authenticateToken, patientController.getPatientMeTags);
router.post('/getDoctorsAppointments', authenticateToken, patientController.getDoctorsAppointments);
router.post('/registerToAppointment', authenticateToken, patientController.registerToAppointment);
router.get('/loadMyAppointments', authenticateToken, patientController.loadMyAppointments);
router.post('/getDoctorCardData', authenticateToken, patientController.getDoctorCardData);
router.get('/loadMyRegisteredAppointments', authenticateToken, patientController.loadMyRegisteredAppointments);
router.delete('/deleteAppointment', authenticateToken, patientController.deleteAppointment);

module.exports = router;
