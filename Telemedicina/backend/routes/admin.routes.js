const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authGuard } = require('../middleware/auth.guard');
const requireRole = require('../middleware/role.guard')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.patch('/updateProfile', authGuard, requireRole('admin'), upload.single('picture'), adminController.updateProfile);
router.get('/admin/getAllPatients', authGuard, requireRole('admin'), adminController.getAllPatients);
router.get('/admin/getAllDoctors', authGuard, requireRole('admin'), adminController.getAllDoctors);
router.get('/admin/getAllAdmins', authGuard, requireRole('admin'), adminController.getAllAdmins);
router.post('/admin/registerPatient', authGuard, requireRole('admin'), adminController.registerPatient);
router.post('/admin/registerDoctor', authGuard, requireRole('admin'), adminController.registerDoctor);
router.post('/admin/registerAdmin', authGuard, requireRole('admin'), adminController.registerAdmin);
router.delete('/admin/deleteUsers', authGuard, requireRole('admin'), adminController.deleteUsers);
router.get('/admin/pendingDoctors', authGuard, requireRole('admin'), adminController.getPendingDoctors);
router.patch('/admin/approveDoctor', authGuard, requireRole('admin'), adminController.approveDoctor);
router.post('/admin/system-messages', authGuard, requireRole('admin'), adminController.createSystemMessage);
router.get('/admin/getAllSystemMessage', authGuard, requireRole('admin'), adminController.listSystemMessages);
router.delete('/admin/delete-system-message', authGuard, requireRole('admin'), adminController.deleteSystemMessage);

module.exports = router;
