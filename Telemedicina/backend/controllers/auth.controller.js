const bcrypt = require('bcrypt');
const { User, Patient, Doctor, Admin } = require('../models');
const jwt = require('jsonwebtoken');

const registerPatient = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, taj, address, birthDate, height, weight, homePhone } = req.body;
    const pictureUrl = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-images%2Fpatient.png?alt=media&token=1ebd70ba-15a8-49bb-bc75-94b596a9c63d';

    // Ellenőrizzük, hogy van-e már ilyen e-mail
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    // Jelszó hash-elése
    const hashedPassword = await bcrypt.hash(password, 10);

    // Felhasználó mentése
    const user = await User.create({
      email,
      name,
      password: hashedPassword,
      role: 'patient',
      phoneNumber,
      address,
      birthDate,
      pictureUrl
    });

    // Páciens bejegyzés létrehozása
    await Patient.create({
      userId: user.id,
      height,
      weight,
      taj,
      homePhone,
      registDate: new Date()
    });

    return res.status(201).json({ message: 'Páciens regisztráció sikeres.' });

  } catch (error) {
    console.error('Hiba a páciens regisztráció során:', error);
    return res.status(500).json({ message: 'Szerverhiba a regisztráció közben.' });
  }
};

const registerDoctor = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, address, birthDate, speciality, introduction } = req.body;
    const pictureUrl = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-images%2Fdoctor.png?alt=media&token=d9271e62-b461-46e4-841e-f046d675c760';

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
      registDate: new Date()
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

    // Token létrehozása
    const token = jwt.sign(
      { email: existingUser.email, role: existingUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
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
