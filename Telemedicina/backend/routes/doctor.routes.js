const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const appointmentsController = require('../controllers/doctor.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/getDoctorMe', authenticateToken, doctorController.getCurrentUser);
router.post('/createAppointment', authenticateToken, appointmentsController.createAppointment);
router.get('/myAppointments', authenticateToken, doctorController.getAppointmentsForCurrentDoctor);
router.get('/getAppointmentUserData', authenticateToken, doctorController.getAppointmentUserData);
router.post('/deleteAppointment', authenticateToken, doctorController.deleteAppointment);

module.exports = router;
