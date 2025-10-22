const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/firebaseAuth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/getAdminMe', authenticateToken, adminController.getCurrentUser);
router.patch('/admin/profile/update', upload.single('picture'), adminController.updateProfile);
router.get('/admin/getAllPatients', authenticateToken, adminController.getAllPatients);
router.get('/admin/getAllDoctors', authenticateToken, adminController.getAllDoctors);
router.get('/admin/getAllAdmins', authenticateToken, adminController.getAllAdmins);
router.post('/admin/registerPatient', authenticateToken, adminController.registerPatient);
router.post('/admin/registerDoctor', authenticateToken, adminController.registerDoctor);
router.post('/admin/registerAdmin', authenticateToken, adminController.registerAdmin);
router.delete('/admin/deleteUsers', authenticateToken, adminController.deleteUsers);
router.get('/admin/pendingDoctors', authenticateToken, adminController.getPendingDoctors);
router.patch('/admin/approveDoctor', authenticateToken, adminController.approveDoctor);
router.post('/admin/system-messages', authenticateToken, adminController.createSystemMessage);
router.get('/admin/getAllSystemMessage', authenticateToken, adminController.listSystemMessages);
router.delete('/admin/delete-system-message', authenticateToken, adminController.deleteSystemMessage);

module.exports = router;
