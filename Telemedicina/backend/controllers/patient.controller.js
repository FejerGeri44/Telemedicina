const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { buildProfile } = require("../utils/profileBuilder");
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
    const { data: doctors, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('status', 'Approved')
      .order('id', { ascending: true });

    if (docErr) {
      console.error('❌ Supabase doctors lekérdezés hiba:', docErr);
      return res.status(500).json({ message: 'Server error', error: String(docErr.message || docErr) });
    }
    if (!doctors || doctors.length === 0) {
      return res.json([]);
    }

    const userIds = doctors
      .map(d => d.user_id ?? d.userId)
      .filter((v) => v !== undefined && v !== null);

    if (userIds.length === 0) {
      const items = doctors.map(d => ({ user: null, doctor: d }));
      return res.json(items);
    }

    const { data: users, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email, address, role, phoneNumber, pictureUrl')
      .in('id', userIds);

    if (userErr) {
      console.error('❌ Supabase users lekérdezés hiba:', userErr);
      return res.status(500).json({ message: 'Server error', error: String(userErr.message || userErr) });
    }

    const usersById = new Map(users?.map(u => [u.id, u]) ?? []);

    const items = doctors.map(d => {
      const uid = d.user_id ?? d.userId ?? null;
      const user = uid != null ? (usersById.get(uid) ?? null) : null;
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
    const userIdStr = String(rawUserId ?? '').trim();
    if (!userIdStr) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen userId.' });
    }

    const userIdNum = Number(userIdStr);
    const hasNumeric = Number.isFinite(userIdNum);

    let doc = null, docErr = null;

    if (hasNumeric) {
      ({ data: doc, error: docErr } = await supabaseAdmin
        .from('doctors')
        .select('id, userId')
        .eq('userId', userIdNum)
        .maybeSingle());
    }

    if (docErr) {
      console.error('❌ Supabase doctors lekérdezés hiba:', docErr);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!doc) {
      return res.status(404).json({ message: `Doctor not found for userId: ${userIdStr}` });
    }

    const doctorId = doc.id;

    const { data: appts, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, doctor_id, patient_id, starts_at, ends_at, status')
      .eq('doctor_id', doctorId)
      .order('starts_at', { ascending: true });

    if (apptErr) {
      console.error('❌ Supabase appointments lekérdezés hiba:', apptErr);
      return res.status(500).json({ message: 'Server error' });
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
    const patientIdStr = String(patientId).trim(); // ha int4, használhatsz Number(patientId)-t
    const fromStr = String(from).trim();
    const toStr   = String(to).trim();

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('appointments')
      .update({
        patient_id: patientIdStr,
        status: 'accepted'
      })
      .eq('doctor_id', doctorIdNorm)
      .eq('starts_at', fromStr)
      .eq('ends_at', toStr)
      .is('patient_id', null)
      .select('id')
      .limit(1);

    if (updErr) {
      console.error('❌ Supabase update error:', updErr);
      return res.status(500).json({ message: 'Szerver hiba', error: String(updErr.message || updErr) });
    }

    if (Array.isArray(updated) && updated.length === 1) {
      const appointmentId = updated[0].id;

      const { data: encUpdated, error: encErr } = await supabaseAdmin
        .from('encounters')
        .update({ patient_id: patientIdStr })
        .eq('appointment_id', appointmentId)
        .is('patient_id', null)
        .select('id, appointment_id, patient_id')
        .limit(1);

      if (encErr) {
        console.error('❌ Supabase update error (encounters):', encErr);
        return res.status(500).json({
          message: 'Időpont elfogadva, de az encounter frissítése nem sikerült.',
          appointment: updated[0],
          error: String(encErr.message || encErr)
        });
      }

      if (!encUpdated || encUpdated.length === 0) {
        const { data: probeEnc, error: probeEncErr } = await supabaseAdmin
          .from('encounters')
          .select('id, appointment_id, patient_id')
          .eq('appointment_id', appointmentId)
          .limit(1);

        if (probeEncErr) {
          console.error('❌ Supabase probe error (encounters):', probeEncErr);
          return res.status(500).json({
            message: 'Időpont elfogadva, de nem sikerült ellenőrizni az encountert.',
            appointment: updated[0],
            error: String(probeEncErr.message || probeEncErr)
          });
        }

        if (!probeEnc || probeEnc.length === 0) {
          return res.status(200).json({
            appointment: updated[0],
            encounter: null,
            hint: 'Ehhez az időponthoz nem találtam encountert. Lehet, hogy az addAppointment nem hozta létre.'
          });
        }

        return res.status(409).json({
          message: 'Az encounter már pácienshez van rendelve ehhez az időponthoz.',
          appointment: updated[0],
          encounter: probeEnc[0]
        });
      }

      return res.status(200).json({appointment: updated[0],});
    }

    const { data: probe, error: probeErr } = await supabaseAdmin
      .from('appointments')
      .select('id, patient_id')
      .eq('doctor_id', doctorIdNorm)
      .eq('starts_at', fromStr)
      .eq('ends_at', toStr)
      .limit(1);

    if (probeErr) {
      console.error('❌ Supabase probe error:', probeErr);
      return res.status(500).json({ message: 'Szerver hiba', error: String(probeErr.message || probeErr) });
    }

    if (!probe || probe.length === 0) {
      return res.status(404).json({
        message: 'Nem található ilyen időpont (doctor_id + from + to).',
        hint: 'Ellenőrizd a from/to pontos string-formátumát és a doctor_id típusát.'
      });
    }

    return res.status(409).json({ message: 'Ez az időpont már foglalt.' });

  } catch (err) {
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

    if ((!appts || appts.length === 0) && Number.isFinite(patientIdNum)) {
      const retry = await fetchApptsByPatientId(patientIdStr);
      if (retry.error) {
        console.error('❌ Supabase appointments retry hiba:', retry.error);
        return res.status(500).json({ message: 'Server error', error: String(retry.error.message || retry.error) });
      }
      appts = retry.data || [];
    }

    if (!appts || appts.length === 0) {
      return res.status(200).json([]);
    }

    const doctorIds = [...new Set(
      appts.map(a => Number(a.doctor_id)).filter(Number.isFinite)
    )];

    let doctorMap = new Map();
    let userMap = new Map();

    if (doctorIds.length > 0) {
      const { data: doctors, error: dErr } = await supabaseAdmin
        .from('doctors')
        .select('id, speciality, introduction, avgRating, registDate, userId')
        .in('id', doctorIds);

      if (dErr) {
        console.error('❌ Supabase doctors hiba:', dErr);
        return res.status(500).json({ message: 'Server error', error: String(dErr.message || dErr) });
      }

      doctorMap = new Map((doctors || []).map(d => [Number(d.id), d]));

      const userIds = [...new Set(
        (doctors || []).map(d => Number(d.userId)).filter(Number.isFinite)
      )];

      if (userIds.length > 0) {
        const { data: users, error: uErr } = await supabaseAdmin
          .from('users')
          .select('id, name, email, role, phoneNumber, address, pictureUrl')
          .in('id', userIds);

        if (uErr) {
          console.error('❌ Supabase users hiba:', uErr);
          return res.status(500).json({ message: 'Server error', error: String(uErr.message || uErr) });
        }

        userMap = new Map((users || []).map(u => [Number(u.id), u]));
      }
    }

    const result = appts.map(appt => {
      const apptId = Number(appt.id);
      const doctorIdNum = Number(appt.doctor_id);

      const doctorDoc = doctorMap.get(doctorIdNum) || null;
      let doctorItem = null;

      if (doctorDoc) {
        const userDoc = userMap.get(Number(doctorDoc.userId)) || null;

        const doctorObj = {
          id: doctorDoc.id,
          speciality: doctorDoc.speciality,
          introduction: doctorDoc.introduction ?? null,
          avgRating: doctorDoc.avgRating ?? null,
          registDate: doctorDoc.registDate ?? null,
        };

        const userObj = userDoc
          ? {
            id: userDoc.id,
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role,
            phoneNumber: userDoc.phoneNumber,
            address: userDoc.address ?? null,
            pictureUrl: userDoc.pictureUrl ?? null,
          }
          : null;

        doctorItem = userObj ? { user: userObj, doctor: doctorObj } : null;
      }

      return {
        id: Number.isFinite(apptId) ? apptId : null,
        doctor: doctorItem,
        from: String(appt.starts_at),
        to: String(appt.ends_at),
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

    const idNum = Number(raw);
    const idStr = String(raw).trim();

    async function clearAppointmentPatientBy(value) {
      return supabaseAdmin
        .from('appointments')
        .update({ patient_id: null })
        .eq('id', value)
        .select('id')
        .single();
    }

    let apptResp = Number.isFinite(idNum) ? await clearAppointmentPatientBy(idNum) : null;
    if (!apptResp || apptResp.error?.code === 'PGRST116') {
      apptResp = await clearAppointmentPatientBy(idStr);
    }

    if (apptResp.error) {
      if (apptResp.error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Nem található ilyen appointment.' });
      }
      console.error('❌ Supabase update hiba (appointments):', apptResp.error);
      return res.status(500).json({ message: 'Server error', error: String(apptResp.error.message || apptResp.error) });
    }

    const appointmentId = apptResp.data?.id ?? (Number.isFinite(idNum) ? idNum : idStr);

    async function clearEncounterPatientBy(value) {
      return supabaseAdmin
        .from('encounters')
        .update({ patient_id: null })
        .eq('appointment_id', value)
        .select('id, appointment_id');
    }

    let encResp = Number.isFinite(idNum) ? await clearEncounterPatientBy(idNum) : null;
    if (!encResp || encResp.error) {
      encResp = await clearEncounterPatientBy(idStr);
    }

    if (encResp.error) {
      console.error('❌ Supabase update hiba (encounters):', encResp.error);
      return res.status(500).json({
        message: 'Időpont lemondva, de az encounter(ek) frissítése nem sikerült.',
        error: String(encResp.error.message || encResp.error)
      });
    }

    return res.status(200).json({
      message: 'Időpont lemondva.',
      appointmentId
    });

  } catch (err) {
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

    const doctorIds = Array.from(
      new Set(
        diagnoses
          .map(d => d.doctor_id)
          .filter(v => v !== null && v !== undefined)
      )
    );

    if (doctorIds.length === 0) {
      const enriched = diagnoses.map(d => ({ ...d, doctor: { user: null, doctor: null } }));
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

    const userIds = Array.from(
      new Set(
        (doctors || [])
          .map(doc => doc?.userId)
          .filter(v => v !== null && v !== undefined)
      )
    );

    let usersById = new Map();
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Supabase users lekérdezés hiba:', usersError);
        return res.status(500).json({ message: 'Server error', error: String(usersError.message || usersError) });
      }

      usersById = new Map((users || []).map(u => [u.id, u]));
    }

    const doctorsById = new Map((doctors || []).map(doc => [doc.id, doc]));

    const result = diagnoses.map(d => {
      const doctorObj = doctorsById.get(d.doctor_id) || null;
      const userObj = doctorObj ? usersById.get(doctorObj.userId) || null : null;

      return {
        ...d,
        doctor: {
          user: userObj,
          doctor: doctorObj
        }
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

    if ((!docs || docs.length === 0) && Number.isFinite(patientIdNum)) {
      const retry = await fetchDocsByPatient(patientIdStr);
      if (retry.error) {
        console.error('❌ user_documents retry hiba:', retry.error);
        return res.status(500).json({ message: 'Server error', error: String(retry.error.message || retry.error) });
      }
      docs = retry.data || [];
    }

    if (error) {
      console.error('❌ user_documents lekérdezés hiba:', error);
      return res.status(500).json({ message: 'Server error', error: String(error.message || error) });
    }

    if (!docs || docs.length === 0) {
      return res.status(200).json([]);
    }

    const doctorIds = Array.from(new Set(docs.map(d => d.doctor_id).filter(v => v !== null && v !== undefined)));
    const encounterIds = Array.from(new Set(docs.map(d => d.encounter_id).filter(v => v !== null && v !== undefined)));

    let doctorsById = new Map();
    if (doctorIds.length > 0) {
      const { data: doctors, error: doctorsError } = await supabaseAdmin
        .from('doctors')
        .select('*')
        .in('id', doctorIds);

      if (doctorsError) {
        console.error('❌ doctors lekérdezés hiba:', doctorsError);
        return res.status(500).json({ message: 'Server error', error: String(doctorsError.message || doctorsError) });
      }
      doctorsById = new Map((doctors || []).map(doc => [doc.id, doc]));
    }

    let usersById = new Map();
    const userIds = Array.from(
      new Set(
        Array.from(doctorsById.values())
          .map(doc => doc?.userId)
          .filter(v => v !== null && v !== undefined)
      )
    );

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ users lekérdezés hiba:', usersError);
        return res.status(500).json({ message: 'Server error', error: String(usersError.message || usersError) });
      }
      usersById = new Map((users || []).map(u => [u.id, u]));
    }

    let encountersById = new Map();
    if (encounterIds.length > 0) {
      const { data: encounters, error: encountersError } = await supabaseAdmin
        .from('encounters')
        .select('*')
        .in('id', encounterIds);

      if (encountersError) {
        console.error('❌ encounters lekérdezés hiba:', encountersError);
        return res.status(500).json({ message: 'Server error', error: String(encountersError.message || encountersError) });
      }
      encountersById = new Map((encounters || []).map(e => [e.id, e]));
    }

    let apptsById = new Map();
    const appointmentIds = Array.from(
      new Set(
        Array.from(encountersById.values())
          .map(e => e?.appointment_id)
          .filter(v => v !== null && v !== undefined)
      )
    );

    if (appointmentIds.length > 0) {
      const { data: appts, error: apptsError } = await supabaseAdmin
        .from('appointments')
        .select('id, starts_at, ends_at')
        .in('id', appointmentIds);

      if (apptsError) {
        console.error('❌ appointments lekérdezés hiba:', apptsError);
        return res.status(500).json({ message: 'Server error', error: String(apptsError.message || apptsError) });
      }
      apptsById = new Map((appts || []).map(a => [a.id, a]));
    }

    const result = docs.map(d => {
      const doctorObj = doctorsById.get(d.doctor_id) || null;
      const userObj = doctorObj ? usersById.get(doctorObj.userId) || null : null;

      const encounterObj = encountersById.get(d.encounter_id) || null;
      const apptObj = encounterObj ? apptsById.get(encounterObj.appointment_id) || null : null;

      const appointment = apptObj
        ? { starts_at: apptObj.starts_at, ends_at: apptObj.ends_at }
        : { starts_at: null, ends_at: null };

      return {
        ...d,
        doctor: {
          user: userObj,
          doctor: doctorObj
        },
        appointment
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ loadMyDocuments hiba:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};
