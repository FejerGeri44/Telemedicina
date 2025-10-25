const {
  Doctor,
  User,
  Patient,
  Appointment,
  DoctorRating,
  sequelize
} = require('../models');
const { admin, db, bucket } = require("../config/firebase-config");
const { nextId } = require('../models/shared/counter');
const {normalizeField, buildLoggedUser} = require("../utils/loggedUserUpdate");
const {Timestamp} = require("@google-cloud/firestore/build/src");
const { FieldPath } = admin.firestore;

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [{
        model: Patient,
        attributes: ['id', 'height', 'weight', 'homePhone', 'taj', 'registDate', 'gender']
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

    const patientData = user.Patient ? {
      id: user.Patient.id,
      height: user.Patient.height,
      weight: user.Patient.weight,
      homePhone: user.Patient.homePhone,
      taj: user.Patient.taj,
      registDate: user.Patient.registDate,
      gender: user.Patient.gender
    } : null;

    return res.status(200).json({ user: userData, patient: patientData });
  } catch (err) {
    console.error('Hiba a /me route-nál:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.getPatientTags = async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ message: 'Missing patientId' });

    const snap = await db
      .collection('patientTags')
      .where('patient_id', '==', patientId)
      .get();

    const tags = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return res.json(tags);
  } catch (err) {
    console.error('❌ getPatientTags error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    let { id, tags, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const userId = String(id);

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const patientsCol = db.collection('patients');
    const existingPatientSnap = await patientsCol
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (existingPatientSnap.empty) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    const patientRef = existingPatientSnap.docs[0].ref;

    const userAllowed    = ['name', 'address', 'phoneNumber'];
    const patientAllowed = ['gender', 'height', 'weight', 'homePhone'];

    const userFields = {};
    const patientFields = {};

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) {
        let v = updateFields[k];
        v = normalizeField(v);
        if (v !== undefined) userFields[k] = v;
      }
    }
    for (const k of patientAllowed) {
      if (updateFields[k] !== undefined) {
        let v = updateFields[k];
        if (k === 'height' || k === 'weight') v = normalizeNumberField(v);
        else v = normalizeField(v);
        if (v !== undefined) patientFields[k] = v;
      }
    }

    let tagsParsed = tags;
    if (typeof tags === 'string') {
      try { tagsParsed = JSON.parse(tags); } catch (_) { tagsParsed = null; }
    }

    if (Array.isArray(tagsParsed)) {
      const toCreate = tagsParsed
        .filter(tg => tg && tg.name && tg.value)
        .map(tg => ({
          tag_name: String(tg.name).trim(),
          tag_value: String(tg.value).trim(),
        }));

      const tagsColName = 'patientTags';
      const existingSnap = await db
        .collection(tagsColName)
        .where('patient_id', '==', Number(id))
        .get();

      if (!existingSnap.empty) {
        const delBatch = db.batch();
        existingSnap.forEach(doc => delBatch.delete(doc.ref));
        await delBatch.commit();
      }

      for (const docData of toCreate) {
        const newId = await nextId(tagsColName);
        const ref = db.collection(tagsColName).doc(String(newId));
        await ref.set({
          id: newId,
          patient_id: Number(id),
          tag_name: docData.tag_name,
          tag_value: docData.tag_value
        });
      }
    }

    if (req.file && req.file.buffer) {
      const objectPath = `user-profilePictures/${userId}`;
      const file = bucket.file(objectPath);

      await file.save(req.file.buffer, {
        resumable: false,
        contentType: req.file.mimetype,
        metadata: { cacheControl: 'public, max-age=31536000' }
      });

      await file.makePublic();

      const cacheBuster = Date.now();
      userFields.pictureUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}?v=${cacheBuster}`;
    }

    const batch = db.batch();

    if (Object.keys(userFields).length > 0)  batch.update(userRef, userFields);
    if (Object.keys(patientFields).length > 0) batch.update(patientRef, patientFields);
    await batch.commit();

    const loggedUser = await buildLoggedUser(db, userId);
    return res.json({ updated: loggedUser });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    return res.status(500).json({ message: 'Server error', error: String(error) });
  }
};

exports.listDoctors = async (req, res) => {
  try {
    const doctorsSnap = await db.collection('doctors').get();
    if (doctorsSnap.empty) return res.json([]);

    const doctors = doctorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const userIds = doctors.map(d => String(d.userId ?? d.id)).filter(Boolean);

    const userDocs = [];
    for (let i = 0; i < userIds.length; i += 10) {
      const chunk = userIds.slice(i, i + 10);
      const qs = await db.collection('users')
        .where(FieldPath.documentId(), 'in', chunk)
        .get();
      userDocs.push(...qs.docs);
    }

    const usersById = {};
    for (const u of userDocs) {
      usersById[u.id] = { id: u.id, ...u.data() };
    }

    const items = doctors.map(d => {
      const uid = String(d.userId ?? d.id);
      const user = usersById[uid] ?? null;
      return { user, doctor: d };
    });

    return res.json(items);
  } catch (err) {
    console.error('❌ listDoctors error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

exports.getDoctorsAppointments = async (req, res) => {
  try {
    const rawUserId = req.body?.userId;
    if (rawUserId === undefined || rawUserId === null || String(rawUserId).trim() === '') {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen userId.' });
    }

    const userIdStr = String(rawUserId).trim();
    const userIdNum = Number(userIdStr);
    const userIdCandidates = Number.isFinite(userIdNum) ? [userIdStr, userIdNum] : [userIdStr];
    const fieldNames = ['userId', 'user_id'];

    let doctorDoc = null;
    for (const field of fieldNames) {
      for (const val of userIdCandidates) {
        const snap = await db.collection('doctors')
          .where(field, '==', val)
          .limit(1)
          .get();
        if (!snap.empty) {
          doctorDoc = snap.docs[0];
          break;
        }
      }
      if (doctorDoc) break;
    }

    if (!doctorDoc) {
      return res.status(404).json({ message: `Doctor not found for userId: ${userIdStr}` });
    }

    const docData = doctorDoc.data() || {};
    const doctorIdNum = Number.isFinite(docData.id) ? Number(docData.id) : Number(doctorDoc.id);
    if (!Number.isFinite(doctorIdNum)) {
      return res.status(500).json({ message: 'Érvénytelen doctor azonosító (id) a doctors rekordban.' });
    }

    const apptSnap = await db.collection('appointments')
      .where('doctor_id', '==', doctorIdNum)
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
    console.error('❌ getDoctorsAppointments error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

exports.registerToAppointment = async (req, res) => {
  try {
    const { doctorId, patientId, from, to } = req.body || {};

    if (doctorId === undefined || doctorId === null)
      return res.status(400).json({ message: 'Hiányzó doctorId.' });
    if (!patientId)
      return res.status(400).json({ message: 'Hiányzó patientId.' });
    if (!from || !to)
      return res.status(400).json({ message: 'Hiányzó from/to.' });

    const doctorIdNorm = typeof doctorId === 'number' ? doctorId : Number(doctorId);
    if (Number.isNaN(doctorIdNorm)) {
      return res.status(400).json({ message: 'doctorId nem konvertálható számmá.' });
    }
    const patientIdStr = String(patientId).trim();
    const fromStr = String(from).trim();
    const toStr   = String(to).trim();

    await db.runTransaction(async (tx) => {
      const q = db.collection('appointments')
        .where('doctor_id', '==', doctorIdNorm)
        .where('from', '==', fromStr)
        .where('to', '==', toStr)
        .limit(1);

      const snap = await tx.get(q);
      if (snap.empty) {
        const err = new Error('NOT_FOUND_BY_TRIPLE');
        err.code = 'NOT_FOUND_BY_TRIPLE';
        throw err;
      }

      const doc = snap.docs[0];
      const ref = doc.ref;
      const data = doc.data();

      if (data.patient_id !== null) {
        const err = new Error('ALREADY_BOOKED');
        err.code = 'ALREADY_BOOKED';
        throw err;
      }

      const fresh = (await tx.get(ref)).data();
      if (fresh.patient_id !== null) {
        const err = new Error('ALREADY_BOOKED');
        err.code = 'ALREADY_BOOKED';
        throw err;
      }

      tx.update(ref, {
        patient_id: patientIdStr,
        status: 'booked',
      });
    });

    return res.status(200).json({ message: 'Sikeres foglalás.' });

  } catch (err) {
    const code = err?.code || '';
    const msg  = String(err?.message || '');

    if (code === 9 || code === 'FAILED_PRECONDITION' || code === 'failed-precondition' || msg.includes('FAILED_PRECONDITION')) {
      return res.status(400).json({
        message: 'Hiányzó Firestore kompozit index ehhez a lekérdezéshez.',
        error: msg,
      });
    }
    if (code === 'NOT_FOUND_BY_TRIPLE') {
      return res.status(404).json({
        message: 'Nem található ilyen időpont (doctor_id + from + to).',
        hint: 'Ellenőrizd a from/to pontos string-formátumát és a doctor_id típusát.'
      });
    }
    if (code === 'ALREADY_BOOKED') {
      return res.status(409).json({ message: 'Ez az időpont már foglalt.' });
    }

    console.error('❌ registerToAppointment error:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: msg });
  }
};

exports.loadMyAppointments = async (req, res) => {
  try {
    const patientId = req.body?.payload;
    if (!patientId) {
      return res.status(400).json({ message: 'Hiányzó patientId (payload).' });
    }

    const patientIdStr = String(patientId).trim();

    const apptSnap = await db
      .collection('appointments')
      .where('patient_id', '==', patientIdStr)
      .get();

    if (apptSnap.empty) {
      return res.status(200).json([]);
    }

    const appts = apptSnap.docs.map((doc) => ({ ref: doc.ref, id: doc.id, ...doc.data() }));
    const doctorIds = new Set(
      appts
        .map(a => (typeof a.doctor_id === 'number' ? a.doctor_id : Number(a.doctor_id)))
        .filter(n => !Number.isNaN(n))
    );

    async function getDoctorById(doctorIdNum) {
      const docId = String(doctorIdNum);

      let docSnap = await db.collection('doctors').doc(docId).get();
      if (!docSnap.exists) {
        const q = await db.collection('doctors').where('id', '==', doctorIdNum).limit(1).get();
        if (q.empty) return null;
        docSnap = q.docs[0];
      }
      return { id: doctorIdNum, ...docSnap.data() };
    }

    const doctorsArr = await Promise.all([...doctorIds].map(id => getDoctorById(id)));
    const doctorMap = new Map(
      doctorsArr
        .filter(Boolean)
        .map(d => [d.id, d])
    );

    const userIds = new Set(
      doctorsArr
        .filter(Boolean)
        .map(d => (typeof d.userId === 'number' ? d.userId : Number(d.userId)))
        .filter(n => !Number.isNaN(n))
    );

    async function getUserById(userIdNum) {
      const docId = String(userIdNum);

      let userSnap = await db.collection('users').doc(docId).get();
      if (!userSnap.exists) {
        const q = await db.collection('users').where('id', '==', userIdNum).limit(1).get();
        if (q.empty) return null;
        userSnap = q.docs[0];
      }
      return { id: userIdNum, ...userSnap.data() };
    }

    const usersArr = await Promise.all([...userIds].map(id => getUserById(id)));
    const userMap = new Map(
      usersArr
        .filter(Boolean)
        .map(u => [u.id, u])
    );

    const result = appts.map(appt => {
      const apptId = typeof appt.id === 'number' ? appt.id : Number(appt.id) || null;
      const doctorIdNum = typeof appt.doctor_id === 'number' ? appt.doctor_id : Number(appt.doctor_id);
      const doctorDoc = doctorMap.get(doctorIdNum) || null;

      let doctorItem = null;
      if (doctorDoc) {
        const userIdNum = typeof doctorDoc.userId === 'number' ? doctorDoc.userId : Number(doctorDoc.userId);
        const userDoc = userMap.get(userIdNum) || null;

        const doctorObj = {
          id: doctorDoc.id,
          speciality: doctorDoc.speciality,
          introduction: doctorDoc.introduction ?? null,
          avgRating: doctorDoc.avgRating ?? null,
          registDate: doctorDoc.registDate,
        };

        const userObj = userDoc
          ? {
            id: userDoc.id,
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role,
            phoneNumber: userDoc.phoneNumber,
            address: userDoc.address ?? null,
            pictureUrl: userDoc.pictureUrl,
          }
          : null;

        doctorItem = userObj
          ? { user: userObj, doctor: doctorObj }
          : null;
      }

      return {
        id: apptId,
        doctor: doctorItem,
        from: String(appt.from),
        to: String(appt.to),
        status: String(appt.status || ''),
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ loadMyAppointments error:', err);
    const msg = String(err?.message || '');
    if (
      err?.code === 9 ||
      err?.code === 'FAILED_PRECONDITION' ||
      err?.code === 'failed-precondition' ||
      msg.includes('FAILED_PRECONDITION')
    ) {
      return res.status(400).json({
        message: 'Hiányzó Firestore kompozit index ehhez a lekérdezéshez.',
        error: msg,
      });
    }
    return res.status(500).json({ message: 'Szerver hiba', error: msg });
  }
};

exports.getDoctorCardData = async (req, res) => {
  const { doctorId } = req.body;

  if (!doctorId) {
    return res.status(400).json({ error: 'Hiányzó doctorId.' });
  }

  try {
    const doctor = await Doctor.findOne({
      where: { id: doctorId },
      attributes: ['speciality'],
      include: [{
        model: User,
        attributes: ['name', 'pictureUrl']
      }]
    });

    if (!doctor || !doctor.User) {
      return res.status(404).json({ error: 'Orvos nem található.' });
    }

    return res.status(200).json({ pictureUrl: doctor.User.pictureUrl, name: doctor.User.name, speciality: doctor.speciality });
  } catch (err) {
    console.error('❌ Hiba a doctor kép lekérdezésénél:', err);
    return res.status(500).json({ error: 'Szerverhiba.' });
  }
};

exports.loadMyRegisteredAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({ message: 'Páciens nem található.' });
    }

    const rows = await Appointment.findAll({
      where: { patient_id: patient.id },
      order: [['from', 'ASC']],
      attributes: ['id', 'from', 'to', 'status'],
      include: [{
        model: Doctor,
        attributes: ['id', 'speciality', 'introduction', 'avgRating', 'registDate', 'userId'],
        include: [{
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate', 'pictureUrl']
        }]
      }]
    });

    const result = rows.map(appt => ({
      id: appt.id,
      from: new Date(appt.from).toISOString(),
      to: new Date(appt.to).toISOString(),
      status: appt.status,
      doctor: {
        user: {
          id: appt.Doctor?.User?.id,
          name: appt.Doctor?.User?.name,
          email: appt.Doctor?.User?.email,
          role: appt.Doctor?.User?.role,
          phoneNumber: appt.Doctor?.User?.phoneNumber,
          address: appt.Doctor?.User?.address,
          birthDate: appt.Doctor?.User?.birthDate,
          pictureUrl: appt.Doctor?.User?.pictureUrl
        },
        doctor: {
          id: appt.Doctor?.id,
          speciality: appt.Doctor?.speciality,
          introduction: appt.Doctor?.introduction ?? null,
          avgRating: appt.Doctor?.avgRating ?? null,
          registDate: appt.Doctor?.registDate ?? null
        }
      }
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba az időpontok lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointmentId = req.body?.payload;
    if (appointmentId === undefined || appointmentId === null) {
      return res.status(400).json({ message: 'Hiányzó appointmentId (payload).' });
    }

    const idNum = typeof appointmentId === 'number' ? appointmentId : Number(appointmentId);
    const idStr = String(appointmentId).trim();

    let ref = db.collection('appointments').doc(idStr);
    let snap = await ref.get();

    if (!snap.exists) {
      const q = await db.collection('appointments').where('id', '==', idNum).limit(1).get();
      if (q.empty) {
        return res.status(404).json({ message: 'Nem található ilyen appointment.' });
      }
      ref = q.docs[0].ref;
    }

    await ref.update({
      patient_id: null,
      status: 'free'
    });

    return res.status(200).json({ message: 'Időpont lemondva.' });
  } catch (err) {
    console.error('❌ cancelAppointment error:', err);
    const msg = String(err?.message || '');
    return res.status(500).json({ message: 'Szerver hiba', error: msg });
  }
};

exports.rateDoctor = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { doctorId, value } = req.body;

    const doctor_id = parseInt(doctorId, 10);
    const val = Number(value);
    if (!Number.isInteger(doctor_id) || !Number.isInteger(val) || val < 1 || val > 5) {
      await t.rollback();
      return res.status(400).json({ message: 'Érvénytelen kérés: doctorId egész szám, value 1..5 egész.' });
    }

    const userId = req.user?.id;

    const patient = await Patient.findOne({ where: { userId }, transaction: t });
    if (!patient) {
      await t.rollback();
      return res.status(403).json({ message: 'Csak páciens értékelhet.' });
    }

    const doctor = await Doctor.findByPk(doctor_id, { transaction: t });
    if (!doctor) {
      await t.rollback();
      return res.status(404).json({ message: 'Orvos nem található.' });
    }

    await DoctorRating.upsert({
      doctor_id,
      patient_id: patient.id,
      value: val
    }, { transaction: t });

    const row = await DoctorRating.findOne({
      where: { doctor_id },
      attributes: [
        [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('value')), 2), 'avg']
      ],
      raw: true,
      transaction: t
    });
    const avg = row?.avg != null ? Number(row.avg) : null;

    await Doctor.update({ avgRating: avg }, { where: { id: doctor_id }, transaction: t });

    await t.commit();
    return res.json({ ok: true, avg });
  } catch (err) {
    await t.rollback();
    console.error('❌ Értékelés mentési hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba az értékelés mentésekor.' });
  }
};
