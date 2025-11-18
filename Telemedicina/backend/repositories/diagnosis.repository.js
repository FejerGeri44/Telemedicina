const sql3 = require('../config/db.config');

const DIAGNOSIS_SELECT_FIELDS = [
  'id', 'appointment_id', 'patient_id', 'doctor_id',
  'chief_complaint', 'onset_date', 'history',
  'bp_sys', 'bp_dia', 'heart_rate', 'temp_c',
  'spo2', 'weight_kg', 'height_cm', 'bmi',
  'exam_summary', 'primary_text',
  'code_system', 'code', 'certainty_pct',
  'severity', 'differentials', 'assessment', 'plan_text',
  'red_flags', 'informed',
  'diagnosis_date'
];

const SELECT_COLUMNS = DIAGNOSIS_SELECT_FIELDS.join(', ');

const DiagnosisRepository = {
  async list({ patientId, doctorId, appointmentId, limit = 50, offset = 0 } = {}) {
    const where = [];
    if (patientId != null) where.push(sql3`patient_id = ${patientId}`);
    if (doctorId != null) where.push(sql3`doctor_id = ${doctorId}`);
    if (appointmentId != null) where.push(sql3`appointment_id = ${appointmentId}`);
    return sql3`
      SELECT ${SELECT_COLUMNS}
      FROM diagnoses ${where.length ? sql3`WHERE ${sql3(where.join(' AND '))}` : sql3``}
      ORDER BY id DESC
        LIMIT ${limit}
      OFFSET ${offset}
    `;
  },

  async listPatientDataWithTagsByIds(patientIds, supabaseAdmin) {
    if (patientIds.length === 0) return [];

    const patientSelectStatement = `
      id, userId, height, weight, taj, homePhone, birthDate, registDate, gender,
      user:users (
        id, name, email, role, phoneNumber, address, pictureUrl
      )
    `;

    const { data: patientsData, error: patientsError } = await supabaseAdmin
      .from('patients')
      .select(patientSelectStatement)
      .in('id', patientIds)
      .order('id', { ascending: true });

    if (patientsError) {
      throw { type: 'DatabaseError', message: String(patientsError.message || patientsError), code: 500, detail: 'Patients data fetch failed.' };
    }

    const patients = Array.isArray(patientsData) ? patientsData : [];
    const patientIdsInResult = [...new Set(patients.map(p => p.id))];

    const { data: tagsData, error: tagsError } = await supabaseAdmin
      .from('patient_tags')
      .select('id, patient_id, tag_name, tag_value')
      .in('patient_id', patientIdsInResult);

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

    return patients.map(r => ({
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
  },

  async createDiagnosisAndFinalizeAppointment({ payload: rawPayload, reqBody, userId, supabaseAdmin, DoctorRatingRepository }) {
    const patientId = reqBody?.patient;
    const appointmentId = reqBody?.appointmentId;

    const { data: doctorRow, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('userId', userId)
      .single();

    if (docErr) {
      throw { type: 'DatabaseError', message: 'Nem sikerült beazonosítani az orvost.', code: 500 };
    }
    const doctorId = doctorRow?.id;

    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, doctor_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      throw { type: 'NotFoundError', message: 'Időpont nem található.', code: 404 };
    }
    if (doctorId && appt.doctor_id !== doctorId) {
      throw { type: 'ForbiddenError', message: 'Az időpont nem ehhez az orvoshoz tartozik.', code: 403 };
    }

    const currentTimestamp = new Date().toISOString();
    const finalPayload = {
      ...rawPayload,
      doctor_id: doctorId,
      patient_id: patientId,
      appointment_id: appointmentId,
      diagnosis_date: currentTimestamp,
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('diagnoses')
      .insert(finalPayload)
      .select(SELECT_COLUMNS)
      .single();

    if (insErr) {
      console.error('❌ Diagnózis beszúrás hiba:', insErr);
      throw { type: 'DatabaseError', message: 'Nem sikerült elmenteni a diagnózist.', code: 500 };
    }

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 2);
    const ratingPayload = {
      doctor_id: doctorId,
      patient_id: patientId,
      value: 0,
      valid_until: validUntilDate.toISOString()
    };

    const insertedRating = await DoctorRatingRepository.create(ratingPayload);
    if (!insertedRating) {
      console.warn('⚠️ Értékelési rekord létrehozása sikertelen. Folytatás...');
    }

    const { data: encUpd, error: encErr } = await supabaseAdmin
      .from('encounters')
      .update({ diagnosis_id: inserted.id })
      .eq('appointment_id', appointmentId)
      .is('diagnosis_id', null)
      .select('id, appointment_id, diagnosis_id');

    let encounterResponse = {};
    if (encErr) {
      console.error('⚠️ Encounter frissítés hiba:', encErr);
      encounterResponse = { _warning: 'Encounter nem frissült (diagnosis_id).' };
    } else if (!encUpd || encUpd.length === 0) {
      const { data: probeEnc } = await supabaseAdmin
        .from('encounters')
        .select('id, appointment_id, diagnosis_id')
        .eq('appointment_id', appointmentId)
        .limit(1);

      if (probeEnc && probeEnc.length > 0) {
        encounterResponse = { _info: 'Encounterben már volt diagnosis_id, nem írtuk felül.' };
      } else {
        encounterResponse = { _warning: 'Ehhez az appointmenthez nincs encounter.' };
      }
    } else {
      encounterResponse = { encounter: encUpd };
    }

    const { error: updErr } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'done' })
      .eq('id', appointmentId);

    if (updErr) {
      console.error('⚠️ Appointment státusz frissítés hiba:', updErr);
      return { ...inserted, ...encounterResponse, _warning: 'Appointment status not updated' };
    }

    return { ...inserted, ...encounterResponse };
  },

  async listDiagnosesByPatientWithDetails(patientId, client = sql3) {
    const rows = await client`
    SELECT
      d.id,
      d.appointment_id AS "appointmentId",
      d.patient_id AS "patientId",
      d.doctor_id AS "doctorId",
      d.primary_text AS "primaryText",
      d.diagnosis_date,

      pu.id AS patient_user_id,
      pu.email AS patient_user_email,
      pu.name AS patient_user_name,
      pu.role AS patient_user_role,
      pu."phoneNumber" AS patient_user_phone_number,
      pu.address AS patient_user_address,
      pu."pictureUrl" AS patient_user_picture_url,

      p.gender AS patient_gender,
      p.height AS patient_height,
      p.weight AS patient_weight,
      p."birthDate" AS patient_birth_date,
      p.taj AS patient_taj,
      p."homePhone" AS patient_home_phone,
      p."registDate" AS patient_regist_date,

      du.id AS doctor_user_id,
      du.email AS doctor_user_email,
      du.name AS doctor_user_name,
      du.role AS doctor_user_role,
      du."phoneNumber" AS doctor_user_phone_number,
      du.address AS doctor_user_address,
      du."pictureUrl" AS doctor_user_picture_url,

      doc.id AS doctor_profile_id,
      doc."userId" AS doctor_profile_user_id,
      doc.speciality AS doctor_speciality,
      doc.introduction AS doctor_introduction,
      doc."avgRating" AS doctor_avg_rating,
      doc."registDate" AS doctor_regist_date,
      doc.status AS doctor_status

    FROM diagnoses d
    JOIN patients p ON d.patient_id = p.id
    JOIN users pu ON p."userId" = pu.id
    JOIN doctors doc ON d.doctor_id = doc.id
    JOIN users du ON doc."userId" = du.id
    WHERE d.patient_id = ${patientId}
    ORDER BY d.id DESC
  `;

    return rows.map(row => ({
      ...row,

      doctor_data: {
        user: {
          id: row.doctor_user_id,
          email: row.doctor_user_email,
          name: row.doctor_user_name,
          role: row.doctor_user_role,
          phoneNumber: row.doctor_user_phone_number,
          address: row.doctor_user_address,
          pictureUrl: row.doctor_user_picture_url,
        },
        doctor: {
          id: row.doctor_profile_id,
          userId: row.doctor_profile_user_id,
          speciality: row.doctor_speciality,
          introduction: row.doctor_introduction,
          avgRating: row.doctor_avg_rating,
          registDate: row.doctor_regist_date,
          status: row.doctor_status,
        },
      },

      patient_data: {
        user: {
          id: row.patient_user_id,
          email: row.patient_user_email,
          name: row.patient_user_name,
          role: row.patient_user_role,
          phoneNumber: row.patient_user_phone_number,
          address: row.patient_user_address,
          pictureUrl: row.patient_user_picture_url,
        },
        patient: {
          id: row.patientId,
          userId: row.patient_user_id,
          gender: row.patient_gender,
          height: row.patient_height,
          weight: row.patient_weight,
          birthDate: row.patient_birth_date,
          taj: row.patient_taj,
          homePhone: row.patient_home_phone,
          registDate: row.patient_regist_date,
        },
      }
    }));
  }
};

module.exports = DiagnosisRepository;
