const express = require('express');
const router = express.Router();
const {authGuard} = require("../middleware/auth.guard");
const { registerPatient, registerDoctor, login, logout, me, deleteAccount } = require('../controllers/auth.controller');

router.post('/register/patient', registerPatient);

router.post('/register/doctor', registerDoctor);

router.post('/login', login);

router.get('/me', authGuard, me);

router.post('/logout', logout);

router.delete('/account', authGuard, deleteAccount);

module.exports = router;
