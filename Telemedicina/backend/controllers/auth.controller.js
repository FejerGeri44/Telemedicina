const jwt = require('jsonwebtoken');

const UserProfileService = require('../utils/userProfile');
const UserRepository     = require('../repositories/user.repository');
const DoctorRepository    = require('../repositories/doctor.repository');

const {buildProfile} = require("../utils/profileBuilder");

const { supabaseAdmin } = require('../utils/supabaseAdmin');
const PATIENT_DEFAULT_PICTURE = 'https://ubesundbzjtyxxuwmbgg.supabase.co/storage/v1/object/sign/default-profilePictures/patient.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NTY3MmI1OS1mMmE2LTQyNGItYWU2OC1hOWZlMzEyMTM3YzUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkZWZhdWx0LXByb2ZpbGVQaWN0dXJlcy9wYXRpZW50LnBuZyIsImlhdCI6MTc2MTUwOTE1MSwiZXhwIjoxNzkzMDQ1MTUxfQ.xvmkaDIwoHsPgmR6XZRahidlKg7znEf3B25Rfq5jg_Q';
const DOCTOR_DEFAULT_PICTURE  = 'https://ubesundbzjtyxxuwmbgg.supabase.co/storage/v1/object/sign/default-profilePictures/doctor.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NTY3MmI1OS1mMmE2LTQyNGItYWU2OC1hOWZlMzEyMTM3YzUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkZWZhdWx0LXByb2ZpbGVQaWN0dXJlcy9kb2N0b3IucG5nIiwiaWF0IjoxNzYxNTA5MTM4LCJleHAiOjE3OTMwNDUxMzh9.PNLCo1K7ilfieKqES8DXbjz8mC2-kEyiWtxRGpDskOk';

function toE164HU(input) {
  if (!input) return null;
  let s = String(input).trim().replace(/[()\s\-.]/g, '');
  if (s === '') return null;
  if (s.startsWith('06')) s = '+36' + s.slice(2);
  else if (s.startsWith('0036')) s = '+' + s.slice(2);
  else if (/^36\d+/.test(s)) s = '+' + s;
  else if (/^0\d+/.test(s)) s = '+36' + s.slice(1);
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

function toYMD(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

async function registerPatient(req, res) {
  let created = null;
  try {
    const {
      name, email, password, phoneNumber, taj, address, birthDate,
      height, weight, homePhone, gender
    } = req.body;

    if (!name || !email || !password || !phoneNumber || !address || !birthDate || !taj || !gender) {
      return res.status(400).json({ message: 'Név, e-mail, jelszó, telefonszám, cím, születési dátum, TAJ és nem kötelező.' });
    }

    const emailNorm     = String(email).trim().toLowerCase();
    const phoneE164     = toE164HU(phoneNumber);
    if (!phoneE164) {
      return res.status(400).json({ message: 'Hibás telefonszám (HU, E.164).' });
    }
    const birthDateYMD  = toYMD(birthDate);
    if (!birthDateYMD) {
      return res.status(400).json({ message: 'Hibás születési dátum.' });
    }
    const registDateYMD = toYMD(new Date());

    const existing = await UserRepository.findByEmail(emailNorm);
    if (existing) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    const { data: createdData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
      user_metadata: { name, role: 'patient' }
    });
    if (createErr) {
      return res.status(400).json({ message: createErr.message });
    }
    created = createdData;

    const user = await UserProfileService.createUserWithProfile({
      name,
      email: emailNorm,
      phoneNumber: phoneE164,
      address: String(address).trim(),
      authUid: created.user.id,
      role: 'patient',
      pictureUrl: PATIENT_DEFAULT_PICTURE,
      profile: {
        gender: String(gender).trim(),
        height: height ?? null,
        weight: weight ?? null,
        birthDate: birthDateYMD,
        taj: String(taj).trim(),
        homePhone: homePhone ? String(homePhone).trim() : null,
        registDate: registDateYMD
      }
    });

    return res.status(201).json({
      message: 'Páciens regisztráció sikeres.',
      user
    });

  } catch (error) {
    try {
      if (created?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(created?.user.id);
      }
    } catch (e) {
      console.warn('Supabase user cleanup failed:', e?.message || e);
    }

    console.error('Hiba a páciens regisztráció során:', error);
    const pgCode = error?.code;
    const msg = error?.detail || error?.message || 'Szerverhiba a regisztráció közben.';
    const status = (pgCode === '23502' || pgCode === '23505') ? 400 : 500;
    return res.status(status).json({ message: msg });
  }
}

async function registerDoctor(req, res) {
  try {
    const { name, email, password, phoneNumber, speciality, introduction = null } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Név és e-mail megadása kötelező.' });
    }

    const emailNorm     = String(email).trim().toLowerCase();
    const phoneE164     = toE164HU(phoneNumber);
    const registDateYMD = toYMD(new Date());

    const existing = await UserRepository.findByEmail(emailNorm);
    if (existing) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    let created, createErr, inviteLink = null;
    if (password) {
      ({ data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        password: String(password),
        email_confirm: true,
        user_metadata: { name, role: 'doctor' }
      }));
    } else {
      ({ data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        email_confirm: true,
        user_metadata: { name, role: 'doctor' }
      }));
      if (!createErr && created?.user) {
        const { data: linkData, error: linkErr } =
          await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email: emailNorm });
        if (!linkErr) inviteLink = linkData?.properties?.action_link || null;
      }
    }
    if (createErr) return res.status(400).json({ message: createErr.message });

    const user = await UserProfileService.createUserWithProfile({
      name,
      email: emailNorm,
      phoneNumber: phoneE164,
      authUid: created.user.id,
      role: 'doctor',
      pictureUrl: DOCTOR_DEFAULT_PICTURE,
      profile: {
        speciality,
        introduction,
        avgRating: 0,
        registDate: registDateYMD,
        status: 'Pending'
      }
    });

    return res.status(201).json({
      message: 'Orvos regisztráció sikeres.',
      user,
      inviteLink
    });

  } catch (error) {
    console.error('Hiba az orvos regisztráció során:', error);
    return res.status(500).json({ message: 'Szerverhiba a regisztráció közben.' });
  }
}

const login = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: 'Hiányzó access token.' });
    }

    const decoded = jwt.verify(accessToken, process.env.SUPABASE_JWT_SECRET);
    if (decoded.aud !== 'authenticated') {
      return res.status(401).json({ message: 'Érvénytelen token (audience).' });
    }

    let existingUser = await UserRepository.findByAuthUid(decoded.sub);
    if (!existingUser && decoded.email) {
      existingUser = await UserRepository.findByEmail(String(decoded.email).toLowerCase());
    }
    if (!existingUser) {
      return res.status(401).json({ message: 'Felhasználó nem található.' });
    }

    if (existingUser.role === 'doctor') {
      const doc = await DoctorRepository.getByUserId(existingUser.id);
      const status = doc?.status?.toLowerCase();
      if (!doc || status !== 'approved') {
        return res.status(403).json({
          code: 'DOCTOR_PENDING',
          message: 'Az orvosi fiók még nincs jóváhagyva. Bejelentkezés nem engedélyezett.'
        });
      }
    }

    const TOKEN_EXPIRY_SECONDS = 3600;
    const appToken = jwt.sign(
      { id: existingUser.id, role: existingUser.role },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY_SECONDS + 's' }
    );

    res.cookie(process.env.COOKIE_NAME, appToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 3600_000,
      path: '/',
      partitioned: true
    });

    const { user: u, related } = await buildProfile(existingUser);
    const loggedUser = { user: u, related: related };

    return res.status(200).json({
      message: 'Sikeres bejelentkezés.',
      user: loggedUser,
      expiresIn: TOKEN_EXPIRY_SECONDS
    });
  } catch (err) {
    console.error('Bejelentkezési hiba (Supabase token):', err);
    return res.status(401).json({ message: 'Érvénytelen vagy lejárt token.' });
  }
};

async function me(req, res) {
  try {
    let base;
    if (req.user?.id) {
      base = await UserRepository.findById(req.user.id);
    } else if (req.user?.authUid) {
      base = await UserRepository.findByAuthUid(req.user.authUid);
    } else {
      return res.status(401).json({ message: 'Nincs bejelentkezve.' });
    }

    if (!base) return res.status(404).json({ message: 'Felhasználó nem található.' });

    const { user: u, related } = await buildProfile(base);
    const loggedUser = { user: u, related };
    return res.status(200).json({ user: loggedUser });
  } catch (err) {
    console.error('ME hiba:', err);
    return res.status(500).json({ message: 'Hiba a profil lekérésekor.' });
  }
}

async function deleteAccount(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Nincs bejelentkezve / Felhasználó azonosító hiányzik.' });
    }

    const isDeleted = await UserRepository.deleteById(userId);

    if (!isDeleted) {
      return res.status(404).json({ message: 'A felhasználó nem található az adatbázisban.' });
    }

    res.clearCookie(process.env.COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
    });

    return res.status(200).json({ message: 'Fiók sikeresen törölve.' });

  } catch (error) {
    console.error('Hiba a fiók törlésekor:', error);
    return res.status(500).json({ message: 'Szerverhiba a fiók törlése közben.' });
  }
}

function logout(req, res) {
  res.clearCookie(process.env.COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
  });
  return res.status(200).json({ message: 'Kijelentkezve.' });
}

module.exports = { registerPatient, registerDoctor, login, logout, me, deleteAccount };
