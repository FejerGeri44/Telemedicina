const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { authGuard } = require('../middleware/auth.guard');
const requireRole = require('../middleware/role.guard')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.patch('/updateProfile', authGuard, requireRole('doctor'), upload.single('picture'), doctorController.updateProfile);
router.post('/addAppointment', authGuard, requireRole('doctor'), doctorController.addAppointment);
router.post('/approveOrRejectAppointment', authGuard, requireRole('doctor'), doctorController.approveOrRejectAppointment);
router.post('/deleteAppointment', authGuard, requireRole('doctor'), doctorController.deleteAppointment);
router.post('/getMyAppointments', authGuard, requireRole('doctor'), doctorController.myAppointments);
router.post('/getAllMyPatients', authGuard, requireRole('doctor'), doctorController.getAllMyPatients);
router.post('/getUserDataForDiagnosis', authGuard, requireRole('doctor'), doctorController.getUserDataForDiagnosis);
router.post('/newDiagnosis', authGuard, requireRole('doctor'), doctorController.newDiagnosis);
router.post('/appointmentsByPatient', authGuard, requireRole('doctor'), doctorController.appointmentsByPatient);
router.post('/uploadUserFile', authGuard, requireRole('doctor'), upload.array('files'), doctorController.uploadUserFile);
router.post('/countMyPendingAppointments', authGuard, requireRole('doctor'), doctorController.countMyPendingAppointments);
router.post('/countMyRejections', authGuard, requireRole('doctor'), doctorController.countMyRejections);
router.get('/patients', authGuard, requireRole('doctor'), doctorController.getAllPatients);

module.exports = router;
