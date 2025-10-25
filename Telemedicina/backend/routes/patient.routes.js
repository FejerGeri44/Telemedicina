const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const authenticateToken = require('../middleware/firebaseAuth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.patch('/updateProfile', authenticateToken, upload.single('picture'), patientController.updateProfile);
router.get('/doctors', authenticateToken, patientController.listDoctors);
router.post('/getDoctorsAppointments', authenticateToken, patientController.getDoctorsAppointments);
router.post('/registerToAppointment', authenticateToken, patientController.registerToAppointment);
router.post('/loadMyAppointments', authenticateToken, patientController.loadMyAppointments);
router.patch('/cancelAppointment', authenticateToken, patientController.cancelAppointment);

router.get('/getPatientMe', authenticateToken, patientController.getCurrentUser);
router.get('/patient-tags', authenticateToken, patientController.getPatientTags);
router.post('/getDoctorCardData', authenticateToken, patientController.getDoctorCardData);
router.get('/loadMyRegisteredAppointments', authenticateToken, patientController.loadMyRegisteredAppointments);
router.post('/doctorsRating', authenticateToken, patientController.rateDoctor);

module.exports = router;
