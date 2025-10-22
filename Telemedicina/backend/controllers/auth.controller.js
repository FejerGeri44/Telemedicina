const bcrypt = require('bcrypt');
const { User, Patient, Doctor, Admin } = require('../models');
const jwt = require('jsonwebtoken');

const { admin }        = require('../config/firebase-config');
const userModel        = require('../models/user.model');
const patientModel     = require('../models/patient.model');

const PATIENT_DEFAULT_PICTURE = 'gs://szakdolgozat-8655.appspot.com/default-profilePictures/patient.png';

function toE164HU(input) {
  if (input == null) return null;
  let s = String(input).trim().replace(/[()\s\-.]/g, '');
  if (s === '') return null;

  if (s.startsWith('06')) s = '+36' + s.slice(2);
  else if (s.startsWith('0036')) s = '+' + s.slice(2);
  else if (/^36\d+/.test(s)) s = '+' + s;
  else if (/^0\d+/.test(s)) s = '+36' + s.slice(1);

  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

const registerPatient = async (req, res) => {

  try {
    const {
      name, email, password, phoneNumber, taj, address, birthDate,
      height, weight, homePhone, gender
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail és jelszó megadása kötelező.' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const phoneE164 = toE164HU(phoneNumber);

    const authUser = await admin.auth()
      .getUserByEmail(emailNorm)
      .catch((e) => {
        if (e && e.code === 'auth/user-not-found') return null;
        throw e;
      });

    let authUid;

    if (authUser) {
      authUid = authUser.uid;

      const userByAuthUid = await userModel.findByAuthUid
        ? await userModel.findByAuthUid(authUid)
        : null;

      if (userByAuthUid) {
        return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
      }

    } else {
      const userRecord = await admin.auth().createUser({
        email: emailNorm,
        password,
        displayName: name || undefined,
      });
      authUid = userRecord.uid;
    }

    const { id: userId } = await userModel.create({
      name: name ?? null,
      email: emailNorm,
      role: 'patient',
      phoneNumber: phoneE164 ?? null,
      address: address ?? null,
      birthDate: birthDate ?? null,
      pictureUrl: PATIENT_DEFAULT_PICTURE,
      authUid,
    });

    const toNumOrNull = v => (v != null && v !== '' ? Number(v) : null);
    await patientModel.create({
      userId: String(userId),
      height: toNumOrNull(height),
      weight: toNumOrNull(weight),
      taj: taj ?? null,
      homePhone: homePhone ?? null,
      gender: gender ?? null,
    });

    return res.status(201).json({
      message: 'Páciens regisztráció sikeres.',
      userId,
      authUid,
    });

  } catch (error) {
    if (error?.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }
    if (error?.code === 'auth/weak-password') {
      return res.status(400).json({ message: 'A jelszó túl gyenge.' });
    }

    console.error('Hiba a páciens regisztráció során:', error);
    return res.status(500).json({ message: 'Szerverhiba a regisztráció közben.' });
  }
};

const registerDoctor = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, address, birthDate, speciality, introduction, status } = req.body;
    const pictureUrl = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-profilePictures%2Fdoctor.png?alt=media&token=7a578ae2-23b6-4316-b9d8-568a0ee9e310';

    // Ellenőrzés: van-e már ilyen felhasználó?
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    // Jelszó hash-elése
    const hashedPassword = await bcrypt.hash(password, 10);

    // Felhasználó mentése
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'doctor',
      phoneNumber,
      address,
      birthDate,
      pictureUrl
    });

    // Orvos-specifikus adatok mentése
    await Doctor.create({
      userId: user.id,
      speciality,
      introduction,
      registDate: new Date(),
      status: 'Pending'
    });

    return res.status(201).json({ message: 'Orvos regisztráció sikeres.' });

  } catch (error) {
    console.error('Hiba az orvos regisztráció során:', error);
    return res.status(500).json({ message: 'Szerverhiba a regisztráció közben.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Felhasználó megkeresése
    const existingUser = await User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(401).json({ message: 'Hibás email vagy jelszó.' });
    }

    // Jelszó ellenőrzése
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Hibás email vagy jelszó.' });
    }

    // 3) ORVOS: státusz ellenőrzése (csak approved léphet be)
    if (existingUser.role === 'doctor') {
      const doc = await Doctor.findOne({
        where: { userId: existingUser.id },
        attributes: ['status']
      });

      const status = doc?.status?.toLowerCase();
      if (!doc || status !== 'approved') {
        console.warn(
          `⛔ Doctor login blocked: userId=${existingUser.id}, email=${email}, status=${status ?? 'missing'}`
        );
        return res.status(403).json({
          code: 'DOCTOR_PENDING',
          message: 'Az orvosi fiók még nincs jóváhagyva. Bejelentkezés nem engedélyezett.'
        });
      }
    }

    // Token létrehozása
    const token = jwt.sign(
      { id: existingUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let extraData = {};

    if (existingUser.role === 'patient') {
      const patientData = await Patient.findOne({ where: { userId: existingUser.id }, attributes: ['height', 'weight', 'homePhone', 'registDate'] });
      if (patientData) {
        extraData = replaceNullWithNA(patientData.dataValues);
      }
    } else if (existingUser.role === 'doctor') {
      const doctorData = await Doctor.findOne({ where: { userId: existingUser.id }, attributes: ['speciality', 'introduction', 'registDate'] });
      if (doctorData) {
        extraData = replaceNullWithNA(doctorData.dataValues);
      }
    } else if (existingUser.role === 'admin') {
      const adminData = await Admin.findOne({ where: { userId: existingUser.id }, attributes: ['registDate'] });
      if (adminData) {
        extraData = replaceNullWithNA(adminData.dataValues);
      }
    }

    return res.status(200).json({
      message: 'Sikeres bejelentkezés.',
      token,
      user: {
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        phoneNumber: existingUser.phoneNumber ?? 'N/A',
        address: existingUser.address ?? 'N/A',
        birthDate: existingUser.birthDate ?? 'N/A',
        pictureUrl: existingUser.pictureUrl ?? 'N/A',
        ...extraData
      }
    });

  } catch (error) {
    console.error('Bejelentkezési hiba:', error);
    return res.status(500).json({ message: 'Szerverhiba a bejelentkezés során.' });
  }
};

function replaceNullWithNA(data) {
  const cleanedData = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      cleanedData[key] = data[key] === null ? 'N/A' : data[key];
    }
  }
  return cleanedData;
}

module.exports = {
  registerPatient,
  registerDoctor,
  login
};
