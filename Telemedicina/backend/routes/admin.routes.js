const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authGuard } = require('../middleware/auth.guard');
const requireRole = require('../middleware/role.guard')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.patch('/updateProfile', authGuard, requireRole('admin'), upload.single('picture'), adminController.updateProfile);
router.post('/loadPendingOrDeniedDoctors', authGuard, requireRole('admin'), adminController.loadPendingOrDeniedDoctors);
router.patch('/setDoctorStatus', authGuard, requireRole('admin'), adminController.setDoctorStatus);
router.get('/getAllPatients', authGuard, requireRole('admin'), adminController.getAllPatients);
router.get('/getAllDoctors', authGuard, requireRole('admin'), adminController.getAllDoctors);
router.get('/getAllAdmins', authGuard, requireRole('admin'), adminController.getAllAdmins);
router.post('/deleteUsers', authGuard, requireRole('admin'), adminController.deleteUsers);
router.post('/registerPatient', authGuard, requireRole('admin'), adminController.registerPatient);
router.post('/registerDoctor', authGuard, requireRole('admin'), adminController.registerDoctor);
router.post('/registerAdmin', authGuard, requireRole('admin'), adminController.registerAdmin);
router.post('/create-systemMessage', authGuard, requireRole('admin'), adminController.createSystemMessage);
router.get('/getAllSystemMessage', authGuard, requireRole('admin'), adminController.listSystemMessages);
router.post('/delete-system-message', authGuard, requireRole('admin'), adminController.deleteSystemMessage);
router.post('/publish-ai-config', authGuard, requireRole('admin'), adminController.publishAiConfig);

module.exports = router;
