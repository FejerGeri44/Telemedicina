const { Patient, Doctor, User, Appointment, PatientTag, Diagnosis} = require('../repositories');
const {Op} = require("sequelize");
const {supabaseAdmin} = require("../utils/supabaseAdmin");
const {buildProfile} = require("../utils/profileBuilder");

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

exports.listMyAppointments = async (req, res) => {
  try {
    const raw = req.body?.id;
    const doctorId = Number(raw);
    if (!Number.isFinite(doctorId)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen doctor id.' });
    }

    const { data: doc, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('id', doctorId)
      .maybeSingle();

    if (docErr) {
      console.error('❌ doctors lekérdezés hiba:', docErr);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!doc) {
      return res.status(404).json({ message: `Doctor not found: ${doctorId}` });
    }

    const { data: appts, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, doctor_id, patient_id, starts_at, ends_at, status')
      .eq('doctor_id', doctorId)
      .order('starts_at', { ascending: true });

    if (apptErr) {
      console.error('❌ appointments lekérdezés hiba:', apptErr);
      return res.status(500).json({ message: 'Server error' });
    }

    const items = (appts ?? []).map(a => ({
      id: a.id,
      doctor_id: a.doctor_id,
      patient_id: a.patient_id ?? null,
      from: a.starts_at,
      to: a.ends_at,
      status: a.status,
    }));

    return res.json(items);
  } catch (err) {
    console.error('❌ listAppointmentsByDoctorId error:', err);
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
        .order('from', {ascending: true});
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

function chunk(arr, size = 10) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
