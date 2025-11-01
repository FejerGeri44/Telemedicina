const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { authGuard } = require('../middleware/auth.guard');
const requireRole = require('../middleware/role.guard')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.patch('/updateProfile', authGuard, requireRole('doctor'), upload.single('picture'), doctorController.updateProfile);
router.post('/addAppointment', authGuard, requireRole('doctor'), doctorController.addAppointment);
router.post('/myAppointments', authGuard, requireRole('doctor'), doctorController.listMyAppointments);
router.post('/deleteAppointment', authGuard, requireRole('doctor'), doctorController.deleteAppointment);
router.post('/resolvePatientNames', authGuard, requireRole('doctor'), doctorController.resolvePatientNames);
router.post('/getMyPatients', authGuard, requireRole('doctor'), doctorController.myAppointments);

router.post('/newDiagnosis', authGuard, requireRole('doctor'), doctorController.newDiagnosis);
router.get('/getAllPatients', authGuard, requireRole('doctor'), doctorController.getAllPatients);

module.exports = router;
