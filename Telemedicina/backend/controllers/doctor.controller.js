const {supabaseAdmin} = require("../utils/supabaseAdmin");
const {buildProfile} = require("../utils/profileBuilder");
const mime = require('mime-types');
const crypto = require('crypto');

exports.updateProfile = async (req, res) => {
  try {
    const { id, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });
    const userId = String(id);

    let storagePath = null;
    let signedUrlToSave = null;

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

    const userAllowed   = ['name', 'address', 'phoneNumber'];
    const doctorAllowed = ['speciality', 'introduction'];

    const userFields = {};
    const doctorFields = {};

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) userFields[k] = updateFields[k];
    }
    for (const k of doctorAllowed) {
      if (updateFields[k] !== undefined) doctorFields[k] = updateFields[k];
    }

    if (signedUrlToSave) {
      userFields.pictureUrl = signedUrlToSave;
    }

    if (Object.keys(userFields).length) {
      const { error } = await supabaseAdmin
        .from('users')
        .update(userFields)
        .eq('id', userId);
      if (error) throw error;
    }

    if (Object.keys(doctorFields).length) {
      const { error } = await supabaseAdmin
        .from('doctors')
        .update(doctorFields)
        .eq('userId', userId);
      if (error) throw error;
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
        url: u?.pictureUrl ?? null,
      }
    });

  } catch (error) {
    console.error('❌ Error updating doctor profile:', error);
    return res.status(500).json({ message: 'Server error', error: String(error?.message || error) });
  }
};

exports.addAppointment = async (req, res) => {
  try {
    const { doctor_id, from, to } = req.body;

    if (from == null || to == null) {
      return res.status(400).json({ message: 'Hiányzó from vagy to mező.' });
    }

    const { data: dup, error: dupErr } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('starts_at', from)
      .eq('ends_at', to)
      .limit(1);

    if (dupErr) {
      console.error('❌ Supabase dup check error:', dupErr);
      return res.status(500).json({ message: 'Server error', error: String(dupErr.message || dupErr) });
    }
    if (dup && dup.length > 0) {
      return res.status(409).json({ message: 'Ez az időpont már létezik ennél az orvosnál.' });
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('appointments')
      .insert({
        doctor_id,
        patient_id: null,
        starts_at: from,
        ends_at: to,
        status: 'free'
      })
      .select()
      .single();

    if (insErr) {
      console.error('❌ Supabase insert error:', insErr);
      return res.status(500).json({ message: 'Server error', error: String(insErr.message || insErr) });
    }

    const { data: encounter, error: encErr } = await supabaseAdmin
      .from('encounters')
      .insert([{
        doctor_id:      doctor_id,
        appointment_id: inserted.id,
        patient_id:     null,
        diagnosis_id:   null
      }])
      .select('id, doctor_id, appointment_id, patient_id, diagnosis_id')
      .single();

    if (encErr) {
      console.error('❌ Supabase insert error (encounters):', encErr);
      const { error: rollbackErr } = await supabaseAdmin
        .from('appointments')
        .delete()
        .eq('id', inserted.id)
        .limit(1);

      if (rollbackErr) {
        console.error('⚠️ Rollback sikertelen, kézi takarítás szükséges:', rollbackErr);
      }

      return res.status(500).json({
        message: 'Encounter létrehozása sikertelen, az appointment visszavonva.',
        error: String(encErr.message || encErr)
      });
    }

    return res.status(201).json({
      id: inserted.id,
      doctor_id: inserted.doctor_id,
      patient_id: inserted.patient_id ?? null,
      from: inserted.starts_at,
      to: inserted.ends_at,
      status: inserted.status
    });
  } catch (error) {
    console.error('❌ addAppointment error:', error);
    return res.status(500).json({ message: 'Server error', error: String(error) });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const rawId = req.body?.id;
    const apptId = Number(rawId);
    if (!Number.isFinite(apptId)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen appointment id.' });
    }

    const { data: deleted, error: delErr } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', apptId)
      .select('id')
      .single();

    if (delErr) {
      if (delErr.code === 'PGRST116') {
        return res.status(404).json({ message: `Appointment not found: ${apptId}` });
      }
      console.error('❌ Supabase delete error:', delErr);
      return res.status(500).json({ message: 'Server error', error: String(delErr.message || delErr) });
    }

    return res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    console.error('❌ deleteAppointment error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

exports.resolvePatientNames = async (req, res) => {
  try {
    const raw = req.body?.patientIds;

    if (!Array.isArray(raw)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen patientIds tömb.' });
    }

    const patientIds = [...new Set(
      raw.map(v => Number(v)).filter(Number.isFinite)
    )];

    if (patientIds.length === 0) {
      return res.status(200).json({ map: {} });
    }

    const { data: patients, error: pErr } = await supabaseAdmin
      .from('patients')
      .select('id, userId')
      .in('id', patientIds);

    if (pErr) {
      console.error('❌ Supabase patients lekérdezés hiba:', pErr);
      return res.status(500).json({ message: 'Server error', error: String(pErr.message || pErr) });
    }

    if (!patients || patients.length === 0) {
      return res.status(200).json({ map: {} });
    }

    const userIds = [...new Set(
      patients.map(p => Number(p.userId)).filter(Number.isFinite)
    )];

    if (userIds.length === 0) {
      return res.status(200).json({ map: {} });
    }

    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', userIds);

    if (uErr) {
      console.error('❌ Supabase users lekérdezés hiba:', uErr);
      return res.status(500).json({ message: 'Server error', error: String(uErr.message || uErr) });
    }

    const usersById = new Map((users || []).map(u => [Number(u.id), u.name]));

    const map = {};
    for (const p of patients) {
      const pid = Number(p.id);
      const uid = Number(p.userId);
      const name = usersById.get(uid);
      if (Number.isFinite(uid) && name) {
        map[pid] = { userId: uid, name };
      }
    }

    return res.status(200).json({ map });
  } catch (err) {
    console.error('❌ Hiba a páciensek nevének feloldásakor:', err);
    return res.status(500).json({ message: 'Server error', error: String(err?.message || err) });
  }
};

exports.myAppointments = async (req, res) => {
  try {
    const raw = req.body?.id;
    if (raw === undefined || raw === null) {
      return res.status(400).json({ message: 'Hiányzó doctor id.' });
    }

    const idNum = Number(raw);
    const idStr = String(raw).trim();

    async function fetchByDoctorId(value) {
      return supabaseAdmin
        .from('appointments')
        .select('id, doctor_id, patient_id, starts_at, ends_at, status')
        .eq('doctor_id', value)
        .order('starts_at', {ascending: true});
    }

    let { data: appts, error: aErr } =
      Number.isFinite(idNum) ? await fetchByDoctorId(idNum) : await fetchByDoctorId(idStr);

    if (aErr) {
      console.error('❌ Supabase appointments hiba:', aErr);
      return res.status(500).json({ message: 'Server error', error: String(aErr.message || aErr) });
    }

    if ((!appts || appts.length === 0) && Number.isFinite(idNum)) {
      const retry = await fetchByDoctorId(idStr);
      if (retry.error) {
        console.error('❌ Supabase appointments retry hiba:', retry.error);
        return res.status(500).json({ message: 'Server error', error: String(retry.error.message || retry.error) });
      }
      appts = retry.data || [];
    }

    return res.status(200).json(appts ?? []);
  } catch (err) {
    console.error('❌ myAppointments error:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.getAllMyPatients = async (req, res) => {
  try {
    const { data: patientsData, error: patientsError } = await supabaseAdmin
      .from('patients')
      .select(`
        id, userId, height, weight, taj, homePhone, birthDate, registDate, gender,
        user:users (
          id, name, email, role, phoneNumber, address, pictureUrl
        )
      `)
      .order('id', { ascending: true });

    if (patientsError) {
      console.error('❌ Supabase patients lekérdezés hiba:', patientsError);
      return res.status(500).json({ message: 'Server error', error: String(patientsError.message || patientsError) });
    }

    const patients = Array.isArray(patientsData) ? patientsData : [];
    if (patients.length === 0) {
      return res.status(200).json([]);
    }

    const patientIds = [...new Set(patients.map(p => p.id))];

    const { data: tagRows, error: tagsError } = await supabaseAdmin
      .from('patient_tags')
      .select('id, patient_id, tag_name, tag_value')
      .in('patient_id', patientIds);

    if (tagsError) {
      console.error('❌ Supabase patient_tags lekérdezés hiba:', tagsError);
      return res.status(500).json({ message: 'Server error (patient_tags)', error: String(tagsError.message || tagsError) });
    }

    const tagsByPatientId = new Map();
    (tagRows ?? []).forEach(t => {
      if (!tagsByPatientId.has(t.patient_id)) tagsByPatientId.set(t.patient_id, []);
      tagsByPatientId.get(t.patient_id).push({
        id: t.id,
        patient_id: t.patient_id,
        tag_name: t.tag_name,
        tag_value: t.tag_value
      });
    });

    const out = patients.map(r => ({
      user: r.user ?? null,
      patient: {
        id: r.id,
        userId: r.userId,
        height: r.height ?? null,
        weight: r.weight ?? null,
        taj: r.taj ?? null,
        homePhone: r.homePhone ?? null,
        registDate: r.registDate ?? null,
        gender: r.gender ?? null,
        tags: tagsByPatientId.get(r.id) ?? []
      }
    }));

    return res.status(200).json(out);
  } catch (err) {
    console.error('❌ Páciensek lekérdezési hiba:', err);
    return res.status(500).json({ message: 'Hiba történt a páciensek lekérdezésekor.', error: String(err?.message || err) });
  }
};

exports.getUserDataForDiagnosis = async (req, res) => {
  try {
    const raw = req.body?.patientIds;

    if (!Array.isArray(raw)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen patientIds tömb.' });
    }

    const patientIds = Array.from(new Set(
      raw.map(v => Number(v)).filter(Number.isFinite)
    ));

    if (patientIds.length === 0) {
      return res.status(200).json([]);
    }

    const { data: patientsData, error: patientsError } = await supabaseAdmin
      .from('patients')
      .select(`
        id, userId, height, weight, taj, homePhone, birthDate, registDate, gender,
        user:users (
          id, name, email, role, phoneNumber, address, pictureUrl
        )
      `)
      .in('id', patientIds)
      .order('id', { ascending: true });

    if (patientsError) {
      console.error('❌ Supabase patients lekérdezés hiba:', patientsError);
      return res.status(500).json({ message: 'Server error', error: String(patientsError.message || patientsError) });
    }

    const { data: tagsData, error: tagsError } = await supabaseAdmin
      .from('patient_tags')
      .select('id, patient_id, tag_name, tag_value')
      .in('patient_id', patientIds);

    if (tagsError) {
      console.error('❌ patient_tags lekérdezés hiba:', tagsError);
    }

    const tagsByPatientId = new Map();
    (tagsData || []).forEach(t => {
      if (!tagsByPatientId.has(t.patient_id)) tagsByPatientId.set(t.patient_id, []);
      tagsByPatientId.get(t.patient_id).push({
        id: t.id,
        patient_id: t.patient_id,
        tag_name: t.tag_name,
        tag_value: t.tag_value
      });
    });

    const out = (patientsData || []).map(r => ({
      user: r.user ?? null,
      patient: {
        id: r.id,
        userId: r.userId,
        height: r.height ?? null,
        weight: r.weight ?? null,
        taj: r.taj ?? null,
        homePhone: r.homePhone ?? null,
        birthDate: r.birthDate ?? null,
        registDate: r.registDate ?? null,
        gender: r.gender ?? null,
        tags: tagsByPatientId.get(r.id) ?? []
      }
    }));

    return res.status(200).json(out);
  } catch (err) {
    console.error('❌ getUserDataForDiagnosis error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err?.message || err) });
  }
};

exports.newDiagnosis = async (req, res) => {
  try {
    const patientId      = req.body?.patient;
    const chiefComplaint = req.body?.symptoms?.chiefComplaint?.trim();
    const primaryText    = req.body?.diagnosis?.primaryText?.trim();
    const appointmentId  = req.body?.appointmentId;

    if (!patientId || !appointmentId || !chiefComplaint || !primaryText) {
      return res.status(400).json({
        error: 'Hiányzó kötelező mezők (patientId, appointmentId, chiefComplaint, primaryText).'
      });
    }

    const { data: doctorRow, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('userId', req.user.id)
      .single();

    if (docErr) {
      console.error('❌ doctors lekérdezés hiba:', docErr);
      return res.status(500).json({ error: 'Nem sikerült beazonosítani az orvost.' });
    }

    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, doctor_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return res.status(404).json({ error: 'Időpont nem található.' });
    }
    if (doctorRow && appt.doctor_id !== doctorRow.id) {
      return res.status(403).json({ error: 'Az időpont nem ehhez az orvoshoz tartozik.' });
    }

    const payload = {
      doctor_id: doctorRow?.id ?? req.user.doctorId ?? null,
      patient_id: patientId,
      appointment_id: appointmentId,

      chief_complaint: chiefComplaint,
      onset_date: req.body?.symptoms?.onsetDate ?? null,
      history: req.body?.symptoms?.history ?? null,

      bp_sys: req.body?.exam?.bpSys ?? null,
      bp_dia: req.body?.exam?.bpDia ?? null,
      heart_rate: req.body?.exam?.heartRate ?? null,
      temp_c: req.body?.exam?.tempC ?? null,
      spo2: req.body?.exam?.spo2 ?? null,
      weight_kg: req.body?.exam?.weightKg ?? null,
      height_cm: req.body?.exam?.heightCm ?? null,
      bmi: req.body?.exam?.bmi ?? null,
      exam_summary: req.body?.exam?.summary ?? null,

      primary_text: primaryText,
      code_system: req.body?.diagnosis?.codeSystem ?? null,
      code: req.body?.diagnosis?.code ?? null,
      certainty_pct: req.body?.diagnosis?.certaintyPct ?? null,
      severity: req.body?.diagnosis?.severity ?? null,
      differentials: req.body?.diagnosis?.differentials ?? null,

      assessment: req.body?.plan?.assessment ?? null,
      plan_text: req.body?.plan?.planText ?? null,
      red_flags: req.body?.plan?.redFlags ?? null,
      informed: req.body?.plan?.informed ?? null
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('diagnoses')
      .insert(payload)
      .select('*')
      .single();

    if (insErr) {
      console.error('❌ Diagnózis beszúrás hiba:', insErr);
      return res.status(500).json({ error: 'Nem sikerült elmenteni a diagnózist.' });
    }

    const { data: encUpd, error: encErr } = await supabaseAdmin
      .from('encounters')
      .update({ diagnosis_id: inserted.id })
      .eq('appointment_id', appointmentId)
      .is('diagnosis_id', null)
      .select('id, appointment_id, diagnosis_id');

    if (encErr) {
      console.error('⚠️ Encounter frissítés hiba:', encErr);
      return res.status(201).json({ ...inserted, _warning: 'Encounter nem frissült (diagnosis_id).' });
    }

    if (!encUpd || encUpd.length === 0) {
      const { data: probeEnc, error: probeErr } = await supabaseAdmin
        .from('encounters')
        .select('id, appointment_id, diagnosis_id')
        .eq('appointment_id', appointmentId)
        .limit(1);

      if (probeErr) {
        console.error('⚠️ Encounter probe hiba:', probeErr);
        return res.status(201).json({ ...inserted, _warning: 'Encounter ellenőrzés nem sikerült.' });
      }

      if (!probeEnc || probeEnc.length === 0) {
        return res.status(201).json({ ...inserted, _warning: 'Ehhez az appointmenthez nincs encounter.' });
      }

      return res.status(201).json({ ...inserted, _info: 'Encounterben már volt diagnosis_id, nem írtuk felül.' });
    }

    const { error: updErr } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'done' })
      .eq('id', appointmentId);

    if (updErr) {
      console.error('⚠️ Appointment státusz frissítés hiba:', updErr);
      return res.status(201).json({ ...inserted, _warning: 'Appointment status not updated', encounter: encUpd });
    }

    return res.status(201).json({ ...inserted, encounter: encUpd });
  } catch (err) {
    console.error('❌ Hiba diagnózis mentésekor:', err);
    return res.status(500).json({ error: 'Nem sikerült elmenteni a diagnózist' });
  }
};

exports.appointmentsByPatient = async (req, res) => {
  try {
    const body = req.body?.payload ?? req.body ?? {};
    const rawPid = body.patient_id;
    const rawDid = body.doctor_id;

    if (rawPid === undefined || rawPid === null) {
      return res.status(400).json({ message: 'Hiányzó patient_id.' });
    }
    if (rawDid === undefined || rawDid === null) {
      return res.status(400).json({ message: 'Hiányzó doctor_id.' });
    }

    const { data: doctorRow, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('userId', req.user.id)
      .single();

    if (docErr || !doctorRow) {
      return res.status(403).json({ message: 'Nem sikerült azonosítani az orvost.' });
    }

    const didNum = Number(rawDid);
    const didStr = String(rawDid).trim();
    const authedDoctorId = doctorRow.id;

    const providedDid =
      Number.isFinite(didNum) ? didNum : didStr;

    if (String(providedDid) !== String(authedDoctorId)) {
      return res.status(403).json({ message: 'Más orvos azonosítójával próbálkozol.' });
    }

    const pidNum = Number(rawPid);
    const pidStr = String(rawPid).trim();

    let query = supabaseAdmin
      .from('appointments')
      .select('id, doctor_id, patient_id, starts_at, ends_at, status')
      .order('starts_at', { ascending: true });

    if (Number.isFinite(didNum)) {
      query = query.eq('doctor_id', didNum);
    } else {
      query = query.eq('doctor_id', didStr);
    }

    if (Number.isFinite(pidNum)) {
      query = query.eq('patient_id', pidNum);
    } else {
      query = query.eq('patient_id', pidStr);
    }

    const { data: appts, error: aErr } = await query;
    if (aErr) {
      return res
        .status(500)
        .json({ message: 'Server error', error: String(aErr.message || aErr) });
    }

    return res.status(200).json(appts ?? []);
  } catch (err) {
    console.error('❌ appointmentsByPatient error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: String(err?.message || err) });
  }
};

exports.uploadUserFile = async (req, res) => {
  try {
    let { patient_id, doctor_id, appointment_id, docType } = req.body || {};

    if (!patient_id && req.body?.payload) {
      try {
        const p = typeof req.body.payload === 'string'
          ? JSON.parse(req.body.payload)
          : req.body.payload;
        patient_id = p.patient_id;
        doctor_id = p.doctor_id;
        appointment_id = p.appointment_id;
        docType = p.docType;
      } catch (e) {
        console.warn('payload parse error:', e);
      }
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Hiányzik a fájl (file mező).' });
    }
    if (!patient_id || !doctor_id || !appointment_id || !docType) {
      return res.status(400).json({ message: 'Hiányzó kötelező mezők (patient_id, doctor_id, appointment_id, docType).' });
    }

    const { data: doctorRow, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('userId', req.user.id)
      .single();

    if (docErr || !doctorRow) {
      console.error('doctor lookup error:', docErr);
      return res.status(403).json({ message: 'Nem sikerült azonosítani az orvost.' });
    }
    if (String(doctorRow.id) !== String(doctor_id)) {
      return res.status(403).json({ message: 'A küldött doctor_id nem egyezik a bejelentkezett orvossal.' });
    }

    const { data: encounterRow, error: encErr } = await supabaseAdmin
      .from('encounters')
      .select('id, patient_id, doctor_id, appointment_id')
      .eq('appointment_id', appointment_id)
      .eq('patient_id', patient_id)
      .eq('doctor_id', doctor_id)
      .maybeSingle();

    if (encErr) {
      console.error('Encounter lookup error:', encErr);
      return res.status(500).json({ message: 'Encounter keresési hiba', error: String(encErr.message || encErr) });
    }
    if (!encounterRow) {
      return res.status(400).json({
        message: 'Nem található encounter a megadott appointment_id-hez (és/vagy patient/doctor kombinációhoz).'
      });
    }

    const guessedExt =
      mime.extension(req.file.mimetype) ||
      path.extname(req.file.originalname).replace('.', '') ||
      'bin';

    const sanitize = (v) => String(v).toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '');
    const safeDocType = sanitize(docType);
    const safePid = sanitize(patient_id);
    const safeDid = sanitize(doctor_id);
    const safeAid = sanitize(appointment_id);

    const uid = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

    const fileName = `${safeDocType}-${safePid}-${safeAid}-${uid}.${guessedExt}`;
    const storagePath = `doctor-${safeDid}/patient-${safePid}/${fileName}`;

    const { data: upRes, error: upErr } = await supabaseAdmin.storage
      .from('user-documents')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype || 'application/octet-stream',
        upsert: false
      });

    if (upErr) {
      console.error('Storage upload error:', upErr, { storagePath });
      return res.status(500).json({
        message: 'Storage feltöltés hiba',
        code: upErr?.statusCode || upErr?.status || null,
        error: upErr?.message || String(upErr),
        path: storagePath
      });
    }

    const insertObj = {
      doctor_id: Number.isFinite(Number(doctor_id)) ? Number(doctor_id) : doctor_id,
      patient_id: Number.isFinite(Number(patient_id)) ? Number(patient_id) : patient_id,
      encounter_id: encounterRow.id,
      storage_path: upRes?.path ?? storagePath
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('user_documents')
      .insert(insertObj)
      .select()
      .single();

    if (insErr) {
      console.error('user_documents insert error:', insErr, { insertObj });
      return res.status(500).json({
        message: 'user_documents beszúrás hiba',
        code: insErr?.code || null,
        error: String(insErr.message || insErr)
      });
    }

    return res.status(201).json({
      message: 'Sikeres fájlfeltöltés és mentés.',
      document: inserted
    });
  } catch (err) {
    console.error('❌ uploadUserFile error:', err);
    return res.status(500).json({ message: 'Server error', error: String(err?.message || err) });
  }
};
