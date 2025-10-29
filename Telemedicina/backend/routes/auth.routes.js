const express = require('express');
const router = express.Router();
const {authGuard} = require("../middleware/auth.guard");
const { registerPatient, registerDoctor, login, logout, me } = require('../controllers/auth.controller');

router.post('/register/patient', registerPatient);

router.post('/register/doctor', registerDoctor);

router.post('/login', login);

router.get('/me', authGuard, me);

router.post('/logout', logout);

module.exports = router;
