const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authGuard } = require('../middleware/auth.guard');
const requireRole = require('../middleware/role.guard')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.patch('/updateProfile', authGuard, requireRole('patient'), upload.single('picture'), patientController.updateProfile);
router.get('/doctors', authGuard, requireRole('patient'), patientController.listDoctors);
router.post('/getDoctorsAppointments', authGuard, requireRole('patient'), patientController.getDoctorsAppointments);
router.post('/registerToAppointment', authGuard, requireRole('patient'), patientController.registerToAppointment);
router.patch('/cancelAppointment', authGuard, requireRole('patient'), patientController.cancelAppointment);
router.post('/loadMyAppointments', authGuard, requireRole('patient'), patientController.loadMyAppointments);
router.post('/loadMyDiagnoses', authGuard, requireRole('patient'), patientController.loadMyDiagnoses);
router.post('/loadMyDocuments', authGuard, requireRole('patient'), patientController.loadMyDocuments);
router.post('/getSignedDocumentUrl', authGuard, requireRole('patient'), patientController.getSignedDocumentUrl);

module.exports = router;
