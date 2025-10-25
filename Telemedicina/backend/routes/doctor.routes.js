const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const authenticateToken = require('../middleware/firebaseAuth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.patch('/updateProfile', authenticateToken, upload.single('picture'), doctorController.updateProfile);
router.post('/addAppointment', authenticateToken, doctorController.addAppointment);
router.post('/myAppointments', authenticateToken, doctorController.listMyAppointments);
router.post('/getAppointmentUserData', authenticateToken, doctorController.getAppointmentUserData);
router.post('/deleteAppointment', authenticateToken, doctorController.deleteAppointment);
router.post('/resolvePatientNames', authenticateToken, doctorController.resolvePatientNames);

router.get('/getDoctorMe', authenticateToken, doctorController.getCurrentUser);
router.get('/getMyPatients', authenticateToken, doctorController.getMyPatients);
router.post('/newDiagnosis', authenticateToken, doctorController.newDiagnosis);
router.get('/getAllPatients', authenticateToken, doctorController.getAllPatients);

module.exports = router;
