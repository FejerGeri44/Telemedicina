const {supabaseAdmin} = require("../utils/supabaseAdmin");
const {buildProfile} = require("../utils/profileBuilder");
const AppointmentRejectionRepository = require("../repositories/appointmentRejection.repository");
const UserDocumentRepository = require("../repositories/userDocument.repository");
const DoctorRatingRepository = require("../repositories/doctorRating.repository");
const {updateDoctorProfile, listMyPatientsWithTagsByUserId, countPendingAppointmentsByDoctorId,
  countRejectionsByDoctorId, listPatientsWithDetailsAndFilter
} = require("../repositories/doctor.repository");
const {createAppointmentAndEncounter, updateAppointmentStatusAndHandleRejection, deleteAppointmentById,
  listAppointmentsWithPatientAndTagsByDoctorId, listAppointmentsByPatientAndDoctor
} = require("../repositories/appointment.repository");
const {listPatientDataWithTagsByIds, createDiagnosisAndFinalizeAppointment} = require("../repositories/diagnosis.repository");

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

    const userAllowed = ['name', 'address', 'phoneNumber'];
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

    const { userRow } = await updateDoctorProfile(
      userId,
      userFields,
      doctorFields,
      supabaseAdmin
    );

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

    const appointmentData = await createAppointmentAndEncounter({
      doctor_id,
      from,
      to,
      supabaseAdmin
    });

    return res.status(201).json(appointmentData);

  } catch (error) {
    console.error('❌ addAppointment error:', error);

    const status = error.code || 500;
    const message = error.message || 'Server error';

    if (error.type === 'ConflictError') {
      return res.status(409).json({ message: message });
    }

    return res.status(status).json({ message: message, error: String(error) });
  }
};

exports.approveOrRejectAppointment = async (req, res) => {
  try {
    const { appointmentId, status } = req.body;
    const allowedStatuses = ['approved', 'rejected'];

    if (!appointmentId) {
      return res.status(400).json({ message: 'Hiányzó appointmentId.' });
    }
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Érvénytelen vagy hiányzó status. Értékek: approved, rejected.' });
    }

    const updatedAppt = await updateAppointmentStatusAndHandleRejection({
      appointmentId,
      status,
      userId: req.user.id,
      supabaseAdmin,
      AppointmentRejectionRepository
    });

    return res.status(200).json({
      message: `Appointment ${status === 'approved' ? 'elfogadva' : 'elutasítva'} sikeresen.`,
      id: updatedAppt.id,
      newStatus: updatedAppt.status
    });

  } catch (err) {
    console.error('❌ approveOrRejectAppointment error:', err);

    const status = err.code || 500;
    const message = err.message || 'Server error';

    if (err.type === 'ForbiddenError' || err.type === 'NotFoundError') {
      return res.status(status).json({ message });
    }

    return res.status(500).json({ message, error: String(err?.message || err) });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const rawId = req.body?.id;
    const apptId = Number(rawId);

    if (!Number.isFinite(apptId)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen appointment id.' });
    }

    const deletedId = await deleteAppointmentById({
      appointmentId: apptId,
      supabaseAdmin
    });

    return res.json({ deleted: true, id: deletedId });

  } catch (err) {
    console.error('❌ deleteAppointment error:', err);

    const status = err.code || 500;
    const message = err.message || 'Server error';

    if (err.type === 'NotFoundError') {
      return res.status(404).json({ message });
    }

    return res.status(status).json({ message, error: String(err) });
  }
};

exports.myAppointments = async (req, res) => {
  try {
    const raw = req.body?.id;
    if (raw === undefined || raw === null) {
      return res.status(400).json({ message: 'Hiányzó doctor id.' });
    }

    const appointments = await listAppointmentsWithPatientAndTagsByDoctorId({
      doctorIdRaw: raw,
      supabaseAdmin,
    });

    return res.status(200).json(appointments);

  } catch (err) {
    console.error('❌ myAppointments error:', err);

    const status = err.code || 500;
    const message = err.message || 'Szerver hiba';

    if (err.type === 'PartialError' || err.type === 'DatabaseError') {
      return res.status(status).json({ message, error: String(err?.message || err) });
    }

    return res.status(500).json({ message, error: String(err?.message || err) });
  }
};

exports.getAllMyPatients = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: 'A felhasználó nem hitelesített.' });
    }

    const patientsList = await listMyPatientsWithTagsByUserId(
      currentUserId,
      supabaseAdmin
    );

    return res.status(200).json(patientsList);

  } catch (err) {
    console.error('❌ Páciensek lekérdezési hiba:', err);

    const status = err.code || 500;
    const message = err.message || 'Hiba történt a páciensek lekérdezésekor.';

    return res.status(status).json({ message, error: String(err?.message || err) });
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

    const out = await listPatientDataWithTagsByIds(
      patientIds,
      supabaseAdmin
    );

    return res.status(200).json(out);
  } catch (err) {
    console.error('❌ getUserDataForDiagnosis error:', err);

    const status = err.code || 500;
    const message = err.message || 'Server error';

    return res.status(status).json({ message, error: String(err?.message || err) });
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

    const payload = {
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

    const result = await createDiagnosisAndFinalizeAppointment({
      payload,
      reqBody: req.body,
      userId: req.user.id,
      supabaseAdmin,
      DoctorRatingRepository
    });

    return res.status(201).json(result);

  } catch (err) {
    console.error('❌ Hiba diagnózis mentésekor:', err);

    const status = err.code || 500;
    const message = err.message || 'Nem sikerült elmenteni a diagnózist';

    return res.status(status).json({ error: message });
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
    const providedDid = Number.isFinite(didNum) ? didNum : didStr;

    if (String(providedDid) !== String(authedDoctorId)) {
      return res.status(403).json({ message: 'Más orvos azonosítójával próbálkozol.' });
    }

    const appts = await listAppointmentsByPatientAndDoctor({
      patientId: rawPid,
      doctorId: rawDid,
      supabaseAdmin,
    });

    return res.status(200).json(appts ?? []);
  } catch (err) {
    console.error('❌ appointmentsByPatient error:', err);

    const status = err.code || 500;
    const message = err.message || 'Server error';

    return res
      .status(status)
      .json({ message: message, error: String(err?.message || err) });
  }
};

exports.uploadUserFile = async (req, res) => {
  try {
    let { patient_id, doctor_id, appointment_id, docTypes } = req.body || {};
    let documentTypes = [];
    try {
      if (docTypes) {
        documentTypes = JSON.parse(docTypes);
      }
    } catch (e) {
      console.error('JSON parse error on docTypes:', e);
      return res.status(400).json({ message: 'Érvénytelen docTypes formátum.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Hiányzik a fájl(ok) (files mező).' });
    }

    if (!patient_id || !doctor_id || !appointment_id || documentTypes.length !== req.files.length) {
      return res.status(400).json({ message: 'Hiányzó kötelező mezők, vagy a docTypes/fájlok száma nem egyezik.' });
    }

    const encounterRow = await UserDocumentRepository.findEncounterByAppointment(
      patient_id,
      doctor_id,
      appointment_id
    );

    console.log('Encounter keresés eredménye (null-t várunk, ha nem talál):', encounterRow);

    if (!encounterRow) {

      return res.status(400).json({
        message: 'Nem található encounter a megadott appointment_id-hez (és/vagy patient/doctor kombinációhoz).'
      });
    }

    const uploadedParams = {
      files: req.files,
      documentTypes,
      patient_id,
      doctor_id,
      appointment_id,
      encounter_id: encounterRow.id,
      supabaseAdmin,
    };

    const insertedDocuments = await UserDocumentRepository.uploadAndCreateDocuments(uploadedParams);

    if (insertedDocuments.length === 0) {
      return res.status(500).json({
        message: 'Egyetlen fájlt sem sikerült feltölteni vagy bejegyezni az adatbázisba.'
      });
    }

    return res.status(201).json({
      message: `Sikeres fájlfeltöltés és mentés (${insertedDocuments.length} db).`,
      documents: insertedDocuments
    });

  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Server error';

    if (status >= 500) {
      console.error('❌ uploadUserFile error:', err);
    }

    return res.status(status).json({ message, error: String(err?.error || err?.message || err) });
  }
};

exports.countMyPendingAppointments = async (req, res) => {
  try {
    const rawId = req.body?.id;
    if (rawId === undefined || rawId === null) {
      return res.status(400).json({ message: 'Hiányzó doctor id.' });
    }

    const doctorId = Number.isFinite(Number(rawId)) ? Number(rawId) : String(rawId).trim();

    const pendingCount = await countPendingAppointmentsByDoctorId(
      doctorId,
      supabaseAdmin
    );

    return res.status(200).json(pendingCount);

  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Server error';

    if (status >= 500) {
      console.error('❌ countMyPendingAppointments error:', err);
    }

    return res.status(status).json({ message, error: String(err?.error || err?.message || err) });
  }
};

exports.countMyRejections = async (req, res) => {
  try {
    const rawId = req.body?.id;
    if (rawId === undefined || rawId === null) {
      return res.status(400).json({ message: 'Hiányzó doctor id.' });
    }

    const doctorId = Number.isFinite(Number(rawId)) ? Number(rawId) : String(rawId).trim();

    const rejectionCount = await countRejectionsByDoctorId(
      doctorId,
      supabaseAdmin
    );

    return res.status(200).json(rejectionCount);

  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Server error';

    if (status >= 500) {
      console.error('❌ countMyRejections error:', err);
    }

    return res.status(status).json({ message, error: String(err?.error || err?.message || err) });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const assembledPatients = await listPatientsWithDetailsAndFilter({
      q,
      limit,
      offset,
      supabaseAdmin,
    });

    return res.status(200).json(assembledPatients);

  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Hiba történt a páciensek lekérdezésekor.';

    if (status >= 500) {
      console.error('❌ Páciensek lekérdezési hiba (Repository):', err);
    }

    return res.status(status).json({
      message: message,
      error: err.error || err.message || String(err)
    });
  }
};
