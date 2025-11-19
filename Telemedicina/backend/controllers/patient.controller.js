const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { buildProfile } = require("../utils/profileBuilder");
const PatientTagRepository = require("../repositories/patientTag.repository");
const {findByDoctorAndPatient, findActiveRequestsByPatientId, updateRatingValue, getCompletedRatingsByDoctorId} = require("../repositories/doctorRating.repository");
const {getDoctorWithUserById, getByUserId, listApprovedDoctorsWithUser, updateAvgRating} = require("../repositories/doctor.repository");
const {updatePatientProfile} = require("../repositories/patient.repository");
const {listByDoctorUserId, registerToAppointment, cancelAppointmentById} = require("../repositories/appointment.repository");
const {listDiagnosesByPatientWithDetails} = require("../repositories/diagnosis.repository");
const {listDocumentsByPatientWithDetails, getSignedUrlIfAuthorized} = require("../repositories/userDocument.repository");

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

    const patientId = Number.isFinite(patientIdNum) ? patientIdNum : patientIdStr;

    const diagnosesWithDetails = await listDiagnosesByPatientWithDetails(patientId);

    if (!diagnosesWithDetails || diagnosesWithDetails.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json(diagnosesWithDetails);

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

    const patientId = Number.isFinite(patientIdNum) ? patientIdNum : patientIdStr;

    const result = await listDocumentsByPatientWithDetails(patientId);

    if (!result || result.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('❌ loadMyDocuments hiba:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.getSignedDocumentUrl = async (req, res) => {
  try {
    const { storagePath, patient_id } = req.body;

    if (!storagePath) {
      return res.status(400).json({ message: 'Hiányzó storagePath.' });
    }

    if (!patient_id) {
      console.warn(`❌ Jogosultsági eltérés, Kért ID: ${patient_id}`);
      return res.status(403).json({ message: 'Nincs jogosultsága ehhez a dokumentumhoz (Azonosító eltérés).' });
    }

    const result = await getSignedUrlIfAuthorized({
      storagePath,
      patient_id,
      supabaseAdmin
    });

    return res.status(200).json({ signedUrl: result.signedUrl });

  } catch (err) {
    const status = err.code || 500;

    if (err.type === 'ForbiddenError') {
      return res.status(403).json({ message: err.message });
    }

    if (err.type === 'StorageError') {
      console.error('❌ Supabase Storage hiba a repóban:', err.error);
      return res.status(status).json({ message: err.message, error: err.error });
    }

    if (err.type === 'DatabaseError' || err.type === 'InternalError') {
      console.error('❌ Adatbázis/Internal hiba a repóban:', err.error || err.message);
      return res.status(500).json({ message: err.message, error: String(err.error || err.message) });
    }

    console.error('❌ getSignedDocumentUrl ÁLTALÁNOS hiba:', err);
    return res.status(500).json({ message: 'Szerver hiba', error: String(err?.message || err) });
  }
};

exports.getActiveRatingRequests = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Hiányzó patientId!" });
    }

    const ratingRequests = await findActiveRequestsByPatientId(patientId);

    if (!ratingRequests || ratingRequests.length === 0) {
      return res.status(200).json([]);
    }

    const enrichedRequests = await Promise.all(
      ratingRequests.map(async (rating) => {
        const doctorDetails = await getDoctorWithUserById(rating.doctor_id);

        return {
          ...rating,
          doctor: doctorDetails
        };
      })
    );

    res.status(200).json(enrichedRequests);

  } catch (err) {
    console.error('CRITICAL ERROR az értékelési kéréseknél:', err);
    res.status(500).json({ message: "Szerver hiba történt." });
  }
};

exports.submitRating = async (req, res) => {
  try {
    const { ratingId, doctorId, value } = req.body;

    if (!ratingId || !doctorId || !value) {
      return res.status(400).json({ message: "Hiányzó adatok (ratingId, doctorId, value)." });
    }

    console.log(`Értékelés beérkezett - RatingID: ${ratingId}, DoctorID: ${doctorId}, Value: ${value}`);

    const updatedRating = await updateRatingValue(ratingId, value);

    if (!updatedRating) {
      return res.status(404).json({ message: "Az értékelés nem található vagy nem sikerült frissíteni." });
    }

    const allRatings = await getCompletedRatingsByDoctorId(doctorId);

    let newAverage = 0;
    if (allRatings.length > 0) {
      const sum = allRatings.reduce((acc, curr) => acc + curr.value, 0);
      newAverage = parseFloat((sum / allRatings.length).toFixed(2));
    }

    if (newAverage > 5) newAverage = 5;

    console.log(`Új átlag kiszámolva: ${newAverage} (${allRatings.length} db értékelés alapján)`);

    await updateAvgRating(doctorId, newAverage);

    res.status(200).json({
      message: "Értékelés sikeresen rögzítve.",
      newAverage: newAverage
    });

  } catch (err) {
    console.error('Hiba az értékelés mentésekor:', err);
    res.status(500).json({ message: "Szerver hiba történt az értékelés feldolgozása során." });
  }
};
