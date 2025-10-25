const jwt = require('jsonwebtoken');

const { admin }        = require('../config/firebase-config');
const userModel        = require('../models/user.model');
const patientModel     = require('../models/patient.model');
const doctorModel     = require('../models/doctor.model');
const {buildProfile} = require("../utils/profileBuilder");

const PATIENT_DEFAULT_PICTURE = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-profilePictures%2Fpatient.png?alt=media&token=cd37f41f-37cf-4a6e-a8f5-091327113834';
const DOCTOR_DEFAULT_PICTURE = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-profilePictures%2Fdoctor.png?alt=media&token=7a578ae2-23b6-4316-b9d8-568a0ee9e310';
const COOKIE_NAME = 'session';

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
    const birthDateYMD = toYMD(birthDate);
    const registDateYMD = toYMD(new Date());

    const authUser = await admin.auth()
      .getUserByEmail(emailNorm)
      .catch((e) => {
        if (e && e.code === 'auth/user-not-found') return null;
        throw e;
      });

    let authUid;

    if (authUser) {
      authUid = authUser.uid;

      const userByAuthUid = userModel.findByAuthUid
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
      name,
      email: emailNorm,
      role: 'patient',
      phoneNumber: phoneE164,
      address,
      pictureUrl: PATIENT_DEFAULT_PICTURE,
      authUid,
    });

    await patientModel.create({
      userId,
      height,
      weight,
      taj,
      birthDate: birthDateYMD,
      homePhone: homePhone ?? null,
      gender,
      registDate: registDateYMD,
    });

    const createdUser = await userModel.findByEmail(email);
    const { user, related } = await buildProfile(createdUser);

    return res.status(201).json({
      message: 'Páciens regisztráció sikeres.',
      user,
      related,
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
    const { name, email, password, phoneNumber, speciality } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail és jelszó megadása kötelező.' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const phoneE164 = toE164HU(phoneNumber);
    const registDateYMD = toYMD(new Date());

    const authUser = await admin.auth()
      .getUserByEmail(emailNorm)
      .catch((e) => {
        if (e && e.code === 'auth/user-not-found') return null;
        throw e;
      });

    let authUid;

    if (authUser) {
      authUid = authUser.uid;

      const userByAuthUid = userModel.findByAuthUid
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
      name,
      email: emailNorm,
      role: 'doctor',
      phoneNumber: phoneE164,
      address: null,
      pictureUrl: DOCTOR_DEFAULT_PICTURE,
      authUid,
    });

    await doctorModel.create({
      userId,
      speciality,
      introduction: null,
      status: 'Pending',
      registDate: registDateYMD,
    });

    // <<< Itt jön a buildProfile >>>
    const createdUser = await userModel.findByEmail(email);
    const { user, related } = await buildProfile(createdUser);

    return res.status(201).json({
      message: 'Orvos regisztráció sikeres.',
      user,
      related,
      authUid,
    });

  } catch (error) {
    if (error?.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }
    if (error?.code === 'auth/weak-password') {
      return res.status(400).json({ message: 'A jelszó túl gyenge.' });
    }

    console.error('Hiba az orvos regisztráció során:', error);
    return res.status(500).json({ message: 'Szerverhiba a regisztráció közben.' });
  }
};

const login = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Hiányzó ID token.' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log('[BE] decoded uid/email/aud:', decoded.uid, decoded.email, decoded.aud);

    const authUid = decoded.uid;

    let existingUser = await userModel.findByAuthUid(authUid);
    if (!existingUser && decoded.email) {
      console.log('[BE] user not found by authUid, try by email:', decoded.email);

      existingUser = await userModel.findByEmail(String(decoded.email).toLowerCase());
    }
    if (!existingUser) {
      console.warn('[BE] NO USER in DB for uid/email:', decoded.uid, decoded.email);

      return res.status(401).json({ message: 'Felhasználó nem található.' });
    }
    console.log('[BE] matched user:', existingUser.id, existingUser.role);

    if (existingUser.role === 'doctor') {
      const doc = await doctorModel.getByUserId(existingUser.id);
      const status = doc?.status?.toLowerCase();
      if (!doc || status !== 'approved') {
        return res.status(403).json({
          code: 'DOCTOR_PENDING',
          message: 'Az orvosi fiók még nincs jóváhagyva. Bejelentkezés nem engedélyezett.'
        });
      }
    }

    const appToken = jwt.sign(
      { id: existingUser.id, role: existingUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie(COOKIE_NAME, appToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 3600_000,
      path: '/',
    });

    const { user, related } = await buildProfile(existingUser);

    return res.status(200).json({
      message: 'Sikeres bejelentkezés.',
      user,
      related
    });

  } catch (err) {
    console.error('Bejelentkezési hiba (idToken):', err);
    return res.status(401).json({ message: 'Érvénytelen vagy lejárt token.' });
  }
};

const logout = (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  });

  return res.status(200).json({ message: 'Logged out' });
};

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

function toYMD(input) {
  if (input == null) return null;

  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const d = (input instanceof Date) ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = {
  registerPatient,
  registerDoctor,
  login,
  logout
};
