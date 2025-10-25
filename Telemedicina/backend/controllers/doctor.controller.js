const { Patient, Doctor, User, Appointment, PatientTag, Diagnosis} = require('../models');
const {Op} = require("sequelize");
const {admin, db, bucket} = require("../config/firebase-config");
const {normalizeField, buildLoggedUser} = require("../utils/loggedUserUpdate");
const {nextId} = require("../models/shared/counter");

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [{
        model: Doctor,
        attributes: ['id', 'speciality', 'introduction', 'avgRating', 'registDate']
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      birthDate: user.birthDate,
      pictureUrl: user.pictureUrl
    };

    const doctorData = user.Doctor ? {
      id: user.Doctor.id,
      speciality: user.Doctor.speciality,
      introduction: user.Doctor.introduction,
      avgRating: user.Doctor.avgRating,
      registDate: user.Doctor.registDate
    } : null;

    return res.status(200).json({ user: userData, doctor: doctorData });
  } catch (err) {
    console.error('Hiba a /me route-nál:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    let { id, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const userIdStr = String(id);
    const userRef = db.collection('users').doc(userIdStr);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const doctorsCol = db.collection('doctors');
    const existingDoctorSnap = await doctorsCol
      .where('userId', '==', userIdStr)
      .limit(1)
      .get();

    if (existingDoctorSnap.empty) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    const doctorRef = existingDoctorSnap.docs[0].ref;

    const userAllowed    = ['name', 'address', 'phoneNumber'];
    const doctorAllowed  = ['speciality', 'introduction'];

    const userFields   = {};
    const doctorFields = {};

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) {
        const v = normalizeField(updateFields[k]);
        if (v !== undefined) userFields[k] = v;
      }
    }
    for (const k of doctorAllowed) {
      if (updateFields[k] !== undefined) {
        const v = normalizeField(updateFields[k]);
        if (v !== undefined) doctorFields[k] = v;
      }
    }

    if (req.file && req.file.buffer) {
      const objectPath = `user-profilePictures/${userIdStr}`;
      const file = bucket.file(objectPath);

      await file.save(req.file.buffer, {
        resumable: false,
        contentType: req.file.mimetype,
        metadata: { cacheControl: 'public, max-age=31536000' },
      });

      await file.makePublic();

      const cacheBuster = Date.now();
      userFields.pictureUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}?v=${cacheBuster}`;
    }

    const batch = db.batch();
    if (Object.keys(userFields).length > 0)  batch.update(userRef, userFields);
    if (Object.keys(doctorFields).length > 0) batch.update(doctorRef, doctorFields);
    await batch.commit();

    const loggedUser = await buildLoggedUser(db, userIdStr);
    return res.json({ updated: loggedUser });

  } catch (error) {
    console.error('❌ Error updating doctor profile:', error);
    return res.status(500).json({ message: 'Server error', error: String(error) });
  }
};

exports.addAppointment = async (req, res) => {
  try {
    const { doctor_id, from, to } = req.body;

    if (from == null || to == null) {
      return res.status(400).json({ message: 'Hiányzó from vagy to mező.' });
    }

    const dupSnap = await db.collection('appointments')
      .where('doctor_id', '==', doctor_id)
      .where('from', '==', from)
      .where('to', '==', to)
      .limit(1)
      .get();

    if (!dupSnap.empty) {
      return res.status(409).json({ message: 'Ez az időpont már létezik ennél az orvosnál.' });
    }

    const newId = await nextId('appointments');

    const payload = {
      id: newId,
      doctor_id: doctor_id,
      patient_id: null,
      from: from,
      to: to,
      status: 'free'
    };

    await db.collection('appointments').doc(String(newId)).set(payload);

    return res.status(201).json(payload);
  } catch (error) {
    console.error('❌ addAppointment error:', error);
    return res.status(500).json({ message: 'Server error', error: String(error) });
  }
};

exports.listMyAppointments = async (req, res) => {
  try {
    const raw = req.body?.id;
    const doctorId = Number(raw);
    if (!Number.isFinite(doctorId)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen doctor id.' });
    }

    const doctorSnap = await db.collection('doctors')
      .where('id', '==', doctorId)
      .limit(1)
      .get();

    if (doctorSnap.empty) {
      return res.status(404).json({ message: `Doctor not found: ${doctorId}` });
    }

    const apptSnap = await db.collection('appointments')
      .where('doctor_id', '==', doctorId)
      .get();

    const items = apptSnap.docs.map(d => {
      const a = d.data();
      return {
        id: a.id,
        doctor_id: a.doctor_id,
        patient_id: a.patient_id ?? null,
        from: a.from,
        to: a.to,
        status: a.status,
      };
    });

    return res.json(items);
  } catch (err) {
    console.error('❌ listAppointmentsByDoctorId error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

exports.getAppointmentUserData = async (req, res) => {
  try {
    const rawIds = req.body?.patientIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.json({});
    }

    const patientIds = [...new Set(
      rawIds
        .filter(v => v !== null && v !== undefined)
        .map(Number)
        .filter(Number.isFinite)
    )];

    if (patientIds.length === 0) return res.json({});

    const chunkSize = 10;
    const patientDocs = [];
    for (let i = 0; i < patientIds.length; i += chunkSize) {
      const chunk = patientIds.slice(i, i + chunkSize);
      const snap = await db.collection('patients')
        .where('id', 'in', chunk)
        .get();
      patientDocs.push(...snap.docs);
    }

    if (patientDocs.length === 0) return res.json({});

    const patientToUserId = new Map();
    const userIds = new Set();
    for (const pdoc of patientDocs) {
      const pdata = pdoc.data();
      const pid = typeof pdata.id === 'number' ? pdata.id : Number(pdoc.id);
      const uid = pdata.userId ? String(pdata.userId) : null;
      if (Number.isFinite(pid) && uid) {
        patientToUserId.set(pid, uid);
        userIds.add(uid);
      }
    }

    if (userIds.size === 0) return res.json({});

    const { FieldPath } = admin.firestore;
    const usersById = {};
    const userIdList = Array.from(userIds);
    for (let i = 0; i < userIdList.length; i += chunkSize) {
      const chunk = userIdList.slice(i, i + chunkSize);
      const snap = await db.collection('users')
        .where(FieldPath.documentId(), 'in', chunk)
        .get();
      for (const udoc of snap.docs) {
        usersById[udoc.id] = { id: udoc.id, ...udoc.data() };
      }
    }

    const result = {};
    for (const pid of patientIds) {
      const uid = patientToUserId.get(pid);
      const user = uid ? usersById[uid] : null;
      if (user && typeof user.name === 'string' && user.name.trim() !== '') {
        result[pid] = { name: user.name.trim() };
      } else {
        result[pid] = { name: '' };
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('❌ getAppointmentUserData error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const rawId = req.body?.id;
    const apptId = Number(rawId);
    if (!Number.isFinite(apptId)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen appointment id.' });
    }

    const apptRef = db.collection('appointments').doc(String(apptId));
    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) {
      return res.status(404).json({ message: `Appointment not found: ${apptId}` });
    }

    await apptRef.delete();

    return res.json({ deleted: true, id: apptId });
  } catch (err) {
    console.error('❌ deleteAppointment error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

exports.getMyPatients = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Missing user id' });
    }

    // Orvos azonosítása
    const doctor = await Doctor.findOne({
      where: { userId },
      attributes: ['id']
    });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Páciensek lekérése (csak azok, akiknek volt időpontjuk az orvoshoz)
    const apps = await Appointment.findAll({
      where: {
        doctor_id: doctor.id,
        patient_id: { [Op.ne]: null },
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'homePhone', 'height', 'weight', 'gender', 'taj'],
          include: [
            {
              model: User,
              attributes: [
                'id', 'name', 'email', 'phoneNumber', 'role', 'address', 'birthDate', 'pictureUrl'
              ]
            }
          ]
        }
      ]
    });

    // Duplikált páciensek kiszűrése
    const byPatient = new Map();

    for (const a of apps) {
      const p = a.Patient;
      if (!p || !p.User) continue;

      if (!byPatient.has(p.id)) {
        const tags = await PatientTag.findAll({
          where: { patient_id: p.id },
          attributes: [
            ['tag_name', 'name'],
            ['tag_value', 'value']
          ]
        });

        byPatient.set(p.id, {
          user: p.User,
          patient: {
            id: p.id,
            homePhone: p.homePhone,
            height: p.height,
            weight: p.weight,
            gender: p.gender,
            taj: p.taj
          },
          tags: tags.map(t => t.get({ plain: true }))
        });
      }
    }

    return res.json( Array.from(byPatient.values()) );

  } catch (err) {
    console.error('❌ getMyPatients error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const rows = await Patient.findAll({
      attributes: ['id','userId','height','weight','taj','homePhone','registDate','gender'],
      include: [{
        model: User,
        attributes: ['id','name','email','role','phoneNumber','address','birthDate','pictureUrl']
      }],
      raw: true,
      nest: true
    });

    const data = rows.map(({ User, ...patient }) => ({ user: User, patient }));
    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Páciensek lekérdezési hiba:', err);
    return res.status(500).json({ message: 'Hiba történt a páciensek lekérdezésekor.', error: err });
  }
};

exports.resolvePatientNames = async (req, res) => {
  try {
    const raw = req.body?.patientIds;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ message: 'Hiányzó vagy üres patientIds tömb.' });
    }

    const patientIds = [...new Set(
      raw
        .map(v => String(v).trim())
        .filter(v => v !== '' && v !== 'null' && v !== 'undefined')
    )];

    if (patientIds.length === 0) {
      return res.status(200).json({ map: {} });
    }

    const patientsById = new Map();
    for (const group of chunk(patientIds, 10)) {
      const docReads = await Promise.all(group.map(id => db.collection('patients').doc(id).get()));
      const missing = [];

      docReads.forEach((snap, idx) => {
        const pid = group[idx];
        if (snap.exists) {
          const data = snap.data();
          if (data?.userId != null) {
            const userIdNum = typeof data.userId === 'number' ? data.userId : Number(String(data.userId));
            if (!Number.isNaN(userIdNum)) patientsById.set(pid, { userId: userIdNum });
          }
        } else {
          missing.push(group[idx]);
        }
      });

      if (missing.length) {
        for (const mgrp of chunk(missing, 10)) {
          const q = await db.collection('patients').where('id', 'in', mgrp.map(x => Number(x))).get();
          q.forEach(doc => {
            const d = doc.data();
            const pidStr = String(d.id);
            const userIdNum = typeof d.userId === 'number' ? d.userId : Number(String(d.userId));
            if (!Number.isNaN(userIdNum)) patientsById.set(pidStr, { userId: userIdNum });
          });
        }
      }
    }

    if (patientsById.size === 0) {
      return res.status(200).json({ map: {} });
    }

    const userIds = [...new Set([...patientsById.values()].map(p => p.userId))];
    const usersById = new Map(); // key: userId(number), val: { name:string }

    for (const group of chunk(userIds, 10)) {
      const docReads = await Promise.all(group.map(id => db.collection('users').doc(String(id)).get()));
      const missing = [];

      docReads.forEach((snap, idx) => {
        const uid = group[idx];
        if (snap.exists) {
          const d = snap.data();
          if (d?.name) usersById.set(uid, { name: d.name });
        } else {
          missing.push(uid);
        }
      });

      if (missing.length) {
        for (const mgrp of chunk(missing, 10)) {
          const q = await db.collection('users').where('id', 'in', mgrp).get();
          q.forEach(doc => {
            const d = doc.data();
            if (d?.id != null && d?.name) usersById.set(d.id, { name: d.name });
          });
        }
      }
    }

    const result = {};
    for (const [patientIdStr, { userId }] of patientsById.entries()) {
      const u = usersById.get(userId);
      if (u?.name) {
        result[patientIdStr] = { userId, name: u.name };
      }
    }

    return res.status(200).json({ map: result });
  } catch (err) {
    console.error('❌ resolvePatientNames error:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || '') });
  }
};

function chunk(arr, size = 10) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

exports.newDiagnosis = async (req, res) => {
  try {
    const patientId = req.body?.patient;
    const chiefComplaint = req.body?.symptoms?.chiefComplaint?.trim();
    const primaryText    = req.body?.diagnosis?.primaryText?.trim();
    const appointmentId  = req.body?.appointmentId;

    if (!patientId || !appointmentId || !chiefComplaint || !primaryText) {
      return res.status(400).json({
        error: 'Hiányzó kötelező mezők (patientId, appointmentId, chiefComplaint, primaryText).'
      });
    }

    const doctor = await Doctor.findOne({
      where: { userId: req.user.id },
      attributes: ['id']
    });

    const appt = await Appointment.findByPk(appointmentId, { attributes: ['id', 'doctor_id', 'patient_id'] });
    if (!appt || (doctor && appt.doctor_id !== doctor.id)) {
      return res.status(403).json({ error: 'Az időpont nem ehhez az orvoshoz tartozik.' });
    }

    // 5) Mentés
    const record = await Diagnosis.create({
      doctorId: doctor?.id ?? req.user.doctorId ?? null,
      patientId,
      appointmentId,

      // Symptoms
      chiefComplaint,
      onsetDate: req.body?.symptoms?.onsetDate ?? null,
      history: req.body?.symptoms?.history ?? null,

      // Exam
      bpSys: req.body?.exam?.bpSys ?? null,
      bpDia: req.body?.exam?.bpDia ?? null,
      heartRate: req.body?.exam?.heartRate ?? null,
      tempC: req.body?.exam?.tempC ?? null,
      spo2: req.body?.exam?.spo2 ?? null,
      weightKg: req.body?.exam?.weightKg ?? null,
      heightCm: req.body?.exam?.heightCm ?? null,
      bmi: req.body?.exam?.bmi ?? null,
      examSummary: req.body?.exam?.summary ?? null,

      // Diagnosis
      primaryText,
      codeSystem: req.body?.diagnosis?.codeSystem ?? null,
      code: req.body?.diagnosis?.code ?? null,
      certaintyPct: req.body?.diagnosis?.certaintyPct ?? null,
      severity: req.body?.diagnosis?.severity ?? null,
      differentials: req.body?.diagnosis?.differentials ?? null,

      // Plan
      assessment: req.body?.plan?.assessment ?? null,
      planText: req.body?.plan?.planText ?? null,
      redFlags: req.body?.plan?.redFlags,
      informed: req.body?.plan?.informed
    });

    await Appointment.update(
      { status: 'done' },
      { where: { id: appointmentId }}
    );

    return res.status(201).json(record);
  } catch (err) {
    console.error('❌ Hiba diagnózis mentésekor:', err);
    return res.status(500).json({ error: 'Nem sikerült elmenteni a diagnózist' });
  }
}
