const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const doctorController = require("../controllers/doctor.controller");

router.get('/getAdminMe', authenticateToken, adminController.getCurrentUser);
router.patch('/admin/profile/update', adminController.updateProfile);
router.get('/admin/getAllPatients', authenticateToken, adminController.getAllPatients);
router.get('/admin/getAllDoctors', authenticateToken, adminController.getAllDoctors);
router.get('/admin/getAllAdmins', authenticateToken, adminController.getAllAdmins);
router.post('/admin/registerPatient', authenticateToken, adminController.registerPatient);
router.post('/admin/registerDoctor', authenticateToken, adminController.registerDoctor);
router.post('/admin/registerAdmin', authenticateToken, adminController.registerAdmin);
router.delete('/admin/deleteUsers', authenticateToken, adminController.deleteUsers);

module.exports = router;
