const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { buildProfile } = require("../utils/profileBuilder");
const PatientTagRepository = require("../repositories/patientTag.repository");
const {findByDoctorAndPatient, getActiveRatingRequestsByPatientId} = require("../repositories/doctorRating.repository");
const {getDoctorWithUserById, getByUserId, listApprovedDoctorsWithUser} = require("../repositories/doctor.repository");
const {getPatientWithUserById, updatePatientProfile} = require("../repositories/patient.repository");
const {listByDoctorUserId, registerToAppointment, cancelAppointmentById} = require("../repositories/appointment.repository");

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

    let tagsParsed = tags;
    if (typeof tagsParsed === 'string') {
      try { tagsParsed = JSON.parse(tagsParsed); } catch { tagsParsed = null; }
    }

    const { userRow } = await updatePatientProfile(
      userId,
      userFields,
      patientFields,
      tagsParsed,
      PatientTagRepository,
      supabaseAdmin
    );

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
    const status = error.message.includes('Nincs patient rekord') || error.message.includes('User not found') ? 404 : 500;

    console.error('❌ Error updating profile:', error);
    return res.status(status).json({ message: 'Server error', error: error.message });
  }
};

exports.listDoctors = async (req, res) => {
  try {
    const patientId = req.patientId;

    const doctorItems = await listApprovedDoctorsWithUser();

    if (!doctorItems || doctorItems.length === 0) {
      return res.json([]);
    }

    const doctorIds = doctorItems.map(item => item.doctor.id).filter(id => id !== null);

    let patientRatingsMap = new Map();
    if (patientId && doctorIds.length > 0) {
      const ratingPromises = doctorIds.map(doctorId =>
        findByDoctorAndPatient(doctorId, patientId)
      );
      const ratings = await Promise.all(ratingPromises);

      ratings.forEach(rating => {
        if (rating) {
          patientRatingsMap.set(rating.doctor_id, rating);
        }
      });
    }

    const items = doctorItems.map(item => {
      const selfRating = patientRatingsMap.get(item.doctor.id);

      if (selfRating) {
        item.ratings = [selfRating];
      }

      return item;
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
    const userIdStr = String(rawUserId ?? '').trim();
    if (!userIdStr) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen userId.' });
    }

    const appts = await listByDoctorUserId({
      userId: userIdStr,
      getDoctorByUserIdFunc: getByUserId
    });

    if (appts === null) {
      return res.status(404).json({ message: `Doctor not found for userId: ${userIdStr}` });
    }

    const items = (appts ?? []).map(appointment => ({
      id: appointment.id,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id ?? null,
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
      status: appointment.status,
    }));

    return res.json(items);
  } catch (err) {
    console.error('❌ getDoctorsAppointments error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

exports.registerToAppointment = async (req, res) => {
  try {
    const { doctorId, patientId, from, to } = req.body || {};

    const doctorIdNorm = typeof doctorId === 'number' ? doctorId : Number(doctorId);
    if (Number.isNaN(doctorIdNorm)) {
      return res.status(400).json({ message: 'doctorId nem konvertálható számmá.' });
    }
    const patientIdStr = String(patientId).trim();
    const fromStr = String(from).trim();
    const toStr   = String(to).trim();

    const resultAppointment = await registerToAppointment({
      doctorId: doctorIdNorm,
      patientIdStr,
      fromStr,
      toStr,
      supabaseAdmin
    });

    return res.status(200).json({ id: resultAppointment.id });

  } catch (err) {
    const status = err.code || 500;

    if (err.type === 'NotFoundError') {
      return res.status(404).json({
        message: err.message,
        hint: 'Ellenőrizd a from/to pontos string-formátumát és a doctor_id típusát.'
      });
    }

    if (err.type === 'ConflictError') {
      return res.status(409).json({ message: err.message });
    }

    if (err.type === 'DatabaseError') {
      console.error('❌ Supabase hiba a repóban:', err.message);
      return res.status(status).json({ message: err.message, error: String(err.message || err) });
    }

    console.error('❌ registerToAppointment error:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.loadMyAppointments = async (req, res) => {
  try {
    const raw = req.body?.patientId;
    const patientIdNum = Number(raw);
    const patientIdStr = String(raw).trim();

    if (!raw && !Number.isFinite(patientIdNum)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen patientId.' });
    }

    async function fetchApptsByPatientId(value) {
      return supabaseAdmin
        .from('appointments')
        .select('id, doctor_id, starts_at, ends_at, status')
        .eq('patient_id', value)
        .order('starts_at', {ascending: true});
    }

    let { data: appts, error: aErr } = Number.isFinite(patientIdNum)
      ? await fetchApptsByPatientId(patientIdNum)
      : await fetchApptsByPatientId(patientIdStr);

    if (aErr) {
      console.error('❌ Supabase appointments hiba:', aErr);
      return res.status(500).json({ message: 'Server error', error: String(aErr.message || aErr) });
    }

    if (!appts || appts.length === 0) {
      return res.status(200).json([]);
    }

    const doctorIds = [...new Set(
      appts.map(a => Number(a.doctor_id)).filter(Number.isFinite)
    )];

    const doctorItemPromises = doctorIds.map(id => getDoctorWithUserById(id));
    const doctorItems = await Promise.all(doctorItemPromises);

    const doctorMap = new Map();
    doctorItems.forEach(item => {
      if (item) doctorMap.set(item.doctor.id, item);
    });

    const result = appts.map(appt => {
      const doctorIdNum = Number(appt.doctor_id);

      const doctorItem = doctorMap.get(doctorIdNum) || null;

      return {
        id: Number(appt.id),
        doctor: doctorItem,
        starts_at: String(appt.starts_at),
        ends_at: String(appt.ends_at),
        status: String(appt.status || ''),
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ loadMyAppointments hiba:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const raw = req.body?.payload;
    if (raw === undefined || raw === null) {
      return res.status(400).json({ message: 'Hiányzó appointmentId (payload).' });
    }

    const result = await cancelAppointmentById({
      appointmentIdRaw: raw,
      supabaseAdmin: supabaseAdmin
    });

    return res.status(200).json({
      message: 'Időpont lemondva.',
      appointmentId: result.appointmentId
    });

  } catch (err) {
    const status = err.code || 500;

    if (err.type === 'NotFoundError') {
      return res.status(404).json({ message: err.message });
    }

    if (err.type === 'PartialDatabaseError') {
      console.error('❌ Részleges hiba a repóban (encounter):', err.error);
      return res.status(500).json({
        message: err.message,
        error: String(err.error),
        appointmentId: err.appointmentId
      });
    }

    if (err.type === 'DatabaseError') {
      console.error('❌ Supabase hiba a repóban:', err.message);
      return res.status(status).json({ message: 'Server error', error: String(err.message || err) });
    }

    console.error('❌ cancelAppointment error:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};



exports.loadMyDiagnoses = async (req, res) => {
  try {
    const raw = req.body?.patientId;

    const patientIdNum = Number(raw);
    const patientIdStr = String(raw ?? '').trim();

    if (!patientIdStr && !Number.isFinite(patientIdNum)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen patientId.' });
    }

    async function fetchByPatientId(value) {
      return supabaseAdmin
        .from('diagnoses')
        .select('*')
        .eq('patient_id', value)
        .order('id', { ascending: true });
    }

    let { data: diagnoses, error } = Number.isFinite(patientIdNum)
      ? await fetchByPatientId(patientIdNum)
      : await fetchByPatientId(patientIdStr);

    if ((!diagnoses || diagnoses.length === 0) && Number.isFinite(patientIdNum)) {
      const retry = await fetchByPatientId(patientIdStr);
      if (retry.error) {
        console.error('❌ Supabase diagnoses retry hiba:', retry.error);
        return res.status(500).json({ message: 'Server error', error: String(retry.error.message || retry.error) });
      }
      diagnoses = retry.data || [];
    }

    if (error) {
      console.error('❌ Supabase diagnoses lekérdezés hiba:', error);
      return res.status(500).json({ message: 'Server error', error: String(error.message || error) });
    }

    if (!diagnoses || diagnoses.length === 0) {
      return res.status(200).json([]);
    }

    const patientIds = Array.from(
      new Set(
        diagnoses
          .map(d => d.patient_id)
          .filter(v => v !== null && v !== undefined)
      )
    );

    let patientsById = new Map();
    let patientUsersById = new Map();
    let patientObj = { user: null, patient: null };

    if (patientIds.length > 0) {
      const { data: patients, error: patientsError } = await supabaseAdmin
        .from('patients')
        .select('*')
        .in('id', patientIds);

      if (patientsError) {
        console.error('❌ Supabase patients lekérdezés hiba:', patientsError);
        return res.status(500).json({ message: 'Server error: Páciens adatok lekérése sikertelen.', error: String(patientsError.message || patientsError) });
      }

      patientsById = new Map((patients || []).map(p => [p.id, p]));

      const patientUserIds = Array.from(
        new Set(
          (patients || [])
            .map(p => p?.userId)
            .filter(v => v !== null && v !== undefined)
        )
      );

      if (patientUserIds.length > 0) {
        const { data: pUsers, error: pUsersError } = await supabaseAdmin
          .from('users')
          .select('*')
          .in('id', patientUserIds);

        if (pUsersError) {
          console.error('❌ Supabase patient users lekérdezés hiba:', pUsersError);
          return res.status(500).json({ message: 'Server error: Páciens felhasználói adatok lekérése sikertelen.', error: String(pUsersError.message || pUsersError) });
        }
        patientUsersById = new Map((pUsers || []).map(u => [u.id, u]));
      }

      const patientData = patientsById.get(patientIds[0]) || null;
      const patientUserData = patientData ? patientUsersById.get(patientData.userId) || null : null;

      patientObj = {
        user: patientUserData,
        patient: patientData
      };
    }

    const doctorIds = Array.from(
      new Set(
        diagnoses
          .map(d => d.doctor_id)
          .filter(v => v !== null && v !== undefined)
      )
    );

    let doctorsById = new Map();
    let doctorUsersById = new Map();

    if (doctorIds.length === 0) {
      const enriched = diagnoses.map(d => ({
        ...d,
        doctor: { user: null, doctor: null },
        patient: patientObj
      }));
      return res.status(200).json(enriched);
    }

    const { data: doctors, error: doctorsError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .in('id', doctorIds);

    if (doctorsError) {
      console.error('❌ Supabase doctors lekérdezés hiba:', doctorsError);
      return res.status(500).json({ message: 'Server error', error: String(doctorsError.message || doctorsError) });
    }

    const doctorUserIds = Array.from(
      new Set(
        (doctors || [])
          .map(doc => doc?.userId)
          .filter(v => v !== null && v !== undefined)
      )
    );

    if (doctorUserIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('id', doctorUserIds);

      if (usersError) {
        console.error('❌ Supabase users lekérdezés hiba:', usersError);
        return res.status(500).json({ message: 'Server error', error: String(usersError.message || usersError) });
      }

      doctorUsersById = new Map((users || []).map(u => [u.id, u]));
    }

    doctorsById = new Map((doctors || []).map(doc => [doc.id, doc]));

    const result = diagnoses.map(d => {
      const doctorObj = doctorsById.get(d.doctor_id) || null;
      const userObj = doctorObj ? doctorUsersById.get(doctorObj.userId) || null : null;

      return {
        ...d,
        doctor_data: {
          user: userObj,
          doctor: doctorObj
        },
        patient_data: patientObj
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ loadMyDiagnoses hiba:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.loadMyDocuments = async (req, res) => {
  try {
    const raw = req.body?.patientId;
    const patientIdNum = Number(raw);
    const patientIdStr = String(raw ?? '').trim();

    if (!patientIdStr && !Number.isFinite(patientIdNum)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen patientId.' });
    }

    async function fetchDocsByPatient(value) {
      return supabaseAdmin
        .from('user_documents')
        .select('*')
        .eq('patient_id', value)
        .order('id', { ascending: true });
    }

    let { data: docs, error } = Number.isFinite(patientIdNum)
      ? await fetchDocsByPatient(patientIdNum)
      : await fetchDocsByPatient(patientIdStr);

    if (error) {
      console.error('❌ user_documents lekérdezés hiba:', error);
      return res.status(500).json({ message: 'Server error', error: String(error.message || error) });
    }

    if ((!docs || docs.length === 0) && Number.isFinite(patientIdNum)) {
      const retry = await fetchDocsByPatient(patientIdStr);
      if (retry.error) {
        console.error('❌ user_documents retry hiba:', retry.error);
      }
      docs = retry.data || [];
    }

    if (!docs || docs.length === 0) {
      return res.status(200).json([]);
    }

    let patientData = null;
    const currentPatientId = Number.isFinite(patientIdNum) ? patientIdNum : patientIdStr;

    const { data: patientRow, error: pErr } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', currentPatientId)
      .single();

    if (pErr && pErr.code !== 'PGRST116') {
      console.error('❌ Páciens rekord lekérdezési hiba:', pErr);
    }

    if (patientRow) {
      const { data: userRow, error: uErr } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role, phoneNumber, address, pictureUrl')
        .eq('id', patientRow.userId)
        .single();

      if (uErr && uErr.code !== 'PGRST116') {
        console.error('❌ Páciens felhasználói adatok lekérdezési hiba:', uErr);
      }

      if (userRow) {
        patientData = {
          user: userRow,
          patient: patientRow
        };
      }
    }

    const doctorIds = Array.from(new Set(docs.map(d => d.doctor_id).filter(v => v)));
    const encounterIds = Array.from(new Set(docs.map(d => d.encounter_id).filter(v => v)));

    let doctorsById = new Map();
    let usersById = new Map();

    if (doctorIds.length > 0) {
      const { data: doctors, error: doctorsError } = await supabaseAdmin
        .from('doctors')
        .select('*')
        .in('id', doctorIds);

      if (doctorsError) {
        console.error('❌ doctors lekérdezés hiba:', doctorsError);
        return res.status(500).json({ message: 'Server error (doctors)', error: String(doctorsError.message || doctorsError) });
      }
      doctorsById = new Map((doctors || []).map(doc => [doc.id, doc]));

      const userIds = Array.from(
        new Set(
          Array.from(doctorsById.values())
            .map(doc => doc?.userId)
            .filter(v => v)
        )
      );

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('*')
          .in('id', userIds);

        if (usersError) {
          console.error('❌ users lekérdezés hiba:', usersError);
          return res.status(500).json({ message: 'Server error (users)', error: String(usersError.message || usersError) });
        }
        usersById = new Map((users || []).map(u => [u.id, u]));
      }
    }

    let diagnosesById = new Map();
    if (encounterIds.length > 0) {
      const { data: encounters, error: encountersError } = await supabaseAdmin
        .from('encounters')
        .select('id, diagnosis_id')
        .in('id', encounterIds);

      if (encountersError) {
        console.error('❌ encounters lekérdezés hiba:', encountersError);
        return res.status(500).json({ message: 'Server error (encounters)', error: String(encountersError.message || encountersError) });
      }

      const diagnosisIds = Array.from(
        new Set(
          (encounters || [])
            .map(e => e?.diagnosis_id)
            .filter(v => v)
        )
      );

      const encountersById = new Map((encounters || []).map(e => [e.id, e]));

      if (diagnosisIds.length > 0) {
        const { data: diagnoses, error: diagnosesError } = await supabaseAdmin
          .from('diagnoses')
          .select('id, diagnosis_date')
          .in('id', diagnosisIds);

        if (diagnosesError) {
          console.error('❌ diagnoses lekérdezés hiba:', diagnosesError);
          return res.status(500).json({ message: 'Server error (diagnoses)', error: String(diagnosesError.message || diagnosesError) });
        }
        diagnosesById = new Map((diagnoses || []).map(d => [d.id, d.diagnosis_date]));
      }

      encountersById.forEach((encounter, id) => {
        const diagnosisDate = diagnosesById.get(encounter.diagnosis_id);
        if (diagnosisDate) {
          encountersById.set(id, { ...encounter, diagnosis_date: diagnosisDate });
        } else {
          encountersById.set(id, { ...encounter, diagnosis_date: null });
        }
      });
      docs = docs.map(d => {
        const encounterData = encountersById.get(d.encounter_id);
        return {
          ...d,
          diagnosis_date: encounterData?.diagnosis_date || null,
        };
      });
    }

    const result = docs.map(d => {
      const doctorObj = doctorsById.get(d.doctor_id) || null;
      const userObj = doctorObj ? usersById.get(doctorObj.userId) || null : null;

      const doctorItem = {
        user: userObj,
        doctor: doctorObj,
      };

      const document = {
        id: Number(d.id),
        doctor_id: Number(d.doctor_id),
        patient_id: Number(d.patient_id),
        encounter_id: String(d.encounter_id),
        storage_path: String(d.storage_path),
      };

      return {
        document: document,
        diagnosis_date: d.diagnosis_date || null,
        patient: patientData,
        doctor: doctorItem,
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ loadMyDocuments hiba:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.getSignedDocumentUrl = async (req, res) => {
  try {
    const { storagePath, patient_id } = req.body;
    const bucketName = 'user-documents';
    const expiresIn = 300;

    if (!storagePath) {
      return res.status(400).json({ message: 'Hiányzó storagePath.' });
    }

    if (!patient_id) {
      console.warn(`❌ Jogosultsági eltérés, Kért ID: ${patient_id}`);
      return res.status(403).json({ message: 'Nincs jogosultsága ehhez a dokumentumhoz (Azonosító eltérés).' });
    }

    const { data: documentData, error: dbError } = await supabaseAdmin
      .from('user_documents')
      .select('id')
      .eq('storage_path', storagePath)
      .eq('patient_id', patient_id)
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return res.status(403).json({ message: 'Nincs jogosultsága ehhez a dokumentumhoz.' });
      }
      console.error('❌ Adatbázis hiba (Tulajdonjog ellenőrzése):', dbError);
      return res.status(500).json({ message: 'Adatbázis hiba a tulajdonjog ellenőrzésekor.' });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('❌ Supabase Storage hiba:', error);

      const safeStatus = (parseInt(error.statusCode || 500, 10) >= 400) ? parseInt(error.statusCode || 500, 10) : 500;

      if (safeStatus === 401) {
        return res.status(401).json({ message: 'Hitelesítési hiba a Storage-ban. Ellenőrizd a Service Role kulcsot!' });
      }

      const errorMessage = safeStatus === 404 ?
        'A dokumentum nem található a tárolóban. Ellenőrizd az elérési utat.' :
        'A fájl elérésének hibája.';

      return res.status(safeStatus).json({
        message: errorMessage,
        error: String(error.message || error)
      });
    }

    if (!data || !data.signedUrl) {
      return res.status(500).json({ message: 'Nem sikerült aláírt URL-t generálni.' });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });

  } catch (err) {
    console.error('❌ getSignedDocumentUrl ÁLTALÁNOS hiba (catch blokk):', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.getActiveRatingRequests = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Hiányzó kötelező mező: patientId.' });
    }

    const rawRatingRequests = await getActiveRatingRequestsByPatientId(patientId);

    if (!rawRatingRequests || rawRatingRequests.length === 0) {
      return res.status(200).json([]);
    }

    const patientItem = await getPatientWithUserById(patientId);

    if (!patientItem) {
      console.error(`Páciens adatok nem találhatók a patientId: ${patientId} azonosítóhoz.`);
      return res.status(404).json({ message: 'Páciens adatok nem találhatók.' });
    }

    const doctorIds = [...new Set(rawRatingRequests.map(r => r.doctor_id))];

    const doctorItemPromises = doctorIds.map(docId => getDoctorWithUserById(docId));
    const doctorItems = await Promise.all(doctorItemPromises);
    const doctorDataMap = new Map();
    doctorItems.forEach(item => {
      if (item) doctorDataMap.set(item.doctor.id, item);
    });

    const formattedRequests = rawRatingRequests
      .map(raw => {
        const doctorItem = doctorDataMap.get(raw.doctor_id);

        if (!doctorItem) return null;

        return {
          id: raw.rating_id,
          doctor: doctorItem,
          patient: patientItem,
          value: raw.value,
          valid_until: raw.valid_until,
        };
      })
      .filter(item => item !== null);

    return res.status(200).json(formattedRequests);

  } catch (err) {
    console.error('❌ Hiba az aktív értékelési kérések lekérdezésekor:', err);
    return res.status(500).json({ message: 'Server error', error: String(err?.message || err) });
  }
};
