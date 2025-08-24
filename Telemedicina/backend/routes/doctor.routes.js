const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const appointmentsController = require('../controllers/doctor.controller');
const authenticateToken = require('../middleware/auth.middleware');
const patientController = require("../controllers/patient.controller");

router.get('/getDoctorMe', authenticateToken, doctorController.getCurrentUser);
router.patch('/doctor/profile/update', doctorController.updateProfile);
router.post('/createAppointment', authenticateToken, appointmentsController.createAppointment);
router.get('/myAppointments', authenticateToken, doctorController.getAppointmentsForCurrentDoctor);
router.post('/getAppointmentUserData', authenticateToken, doctorController.getAppointmentUserData);
router.post('/deleteAppointment', authenticateToken, doctorController.deleteAppointment);
router.get('/getMyPatients', authenticateToken, doctorController.getMyPatients);
router.post('/getUserDataForDiagnosis', authenticateToken, doctorController.getUserDataForDiagnosis);
router.post('/newDiagnosis', authenticateToken, doctorController.newDiagnosis);

module.exports = router;
