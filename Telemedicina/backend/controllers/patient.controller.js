const { db } = require("../config/db.config");
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const {buildProfile} = require("../utils/profileBuilder");
const PatientTagRepository = require("../repositories/patientTag.repository");

exports.updateProfile = async (req, res) => {
  try {
    const { id, tags, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });
    const userId = String(id);

    let signedUrlToSave = null;
    let storagePath = null;

    if (req.file?.buffer) {
      const ext = '.jpg';
      const contentType = 'image/jpeg';
      const filePath = `${userId}${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('user-profilePictures')
        .upload(filePath, req.file.buffer, {
          upsert: true,
          contentType,
          cacheControl: '3600',
        });
      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        return res.status(500).json({ message: 'Kép feltöltése sikertelen.' });
      }

      storagePath = filePath;

      const expiresIn = 7 * 24 * 60 * 60;
      const { data, error } = await supabaseAdmin.storage
        .from('user-profilePictures')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('❌ Signed URL create error:', error);
        return res.status(500).json({ message: 'Signed URL generálása sikertelen.' });
      }

      signedUrlToSave = data.signedUrl;
    }

    const userAllowed = ['name', 'address', 'phoneNumber'];
    const patientAllowed = ['gender', 'height', 'weight', 'homePhone'];

    const userFields = {};
    const patientFields = {};

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) userFields[k] = updateFields[k];
    }
    for (const k of patientAllowed) {
      if (updateFields[k] !== undefined) {
        if (k === 'height' || k === 'weight') {
          const n = Number(updateFields[k]);
          patientFields[k] = Number.isFinite(n) ? n : null;
        } else {
          patientFields[k] = updateFields[k];
        }
      }
    }

    if (signedUrlToSave) userFields.pictureUrl = signedUrlToSave;

    if (Object.keys(userFields).length) {
      const { error } = await supabaseAdmin.from('users').update(userFields).eq('id', userId);
      if (error) throw error;
    }
    if (Object.keys(patientFields).length) {
      const { error } = await supabaseAdmin.from('patients').update(patientFields).eq('userId', userId);
      if (error) throw error;
    }

    const { data: patientRow, error: patErr } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('userId', userId)
      .single();

    if (patErr || !patientRow) {
      console.error('❌ Patient not found for userId:', userId, patErr);
      return res.status(400).json({ message: 'Nincs patient rekord ehhez a userhez.' });
    }

    const patientId = patientRow.id;

    let tagsParsed = tags;
    if (typeof tagsParsed === 'string') {
      try { tagsParsed = JSON.parse(tagsParsed); } catch { tagsParsed = null; }
    }
    if (Array.isArray(tagsParsed)) {
      const cleaned = tagsParsed
        .filter(t => t && t.name && t.value)
        .map(t => ({
          tagName: String(t.name).trim(),
          tagValue: String(t.value).trim()
        }));

      await PatientTagRepository.replaceForPatient(patientId, cleaned);
    }

    const { data: userRow, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (fetchErr) throw fetchErr;
    if (!userRow) return res.status(404).json({ message: 'User not found' });

    const { user: u, related } = await buildProfile(userRow);
    const loggedUser = { user: u, related };

    return res.status(200).json({
      user: loggedUser,
      picture: {
        path: storagePath,
        url: userRow.pictureUrl
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
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
