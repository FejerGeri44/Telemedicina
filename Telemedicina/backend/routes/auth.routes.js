const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Páciens regisztráció
router.post('/register/patient', authController.registerPatient);

// Orvos regisztráció
router.post('/register/doctor', authController.registerDoctor);

// Bejelentkezés
router.post('/login', authController.login);

module.exports = router;
