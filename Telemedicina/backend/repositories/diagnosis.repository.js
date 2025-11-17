const sql3 = require('../config/db.config');


const SELECT_COLUMNS = sql3`
  id,
  appointment_id AS "appointmentId",
  patient_id AS "patientId",
  doctor_id AS "doctorId",
  chief_complaint AS "chiefComplaint",
  onset_date AS "onsetDate",
  history,
  bp_sys AS "bpSys",
  bp_dia AS "bpDia",
  heart_rate AS "heartRate",
  temp_c AS "tempC",
  spo2,
  weight_kg AS "weightKg",
  height_cm AS "heightCm",
  bmi,
  exam_summary AS "examSummary",
  primary_text AS "primaryText",
  code_system AS "codeSystem",
  code,
  certainty_pct AS "certaintyPct",
  severity,
  differentials,
  assessment,
  plan_text AS "planText",
  red_flags AS "redFlags",
  informed
`;

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

  async findById(id) {
    const [row] = await sql3`
      SELECT ${SELECT_COLUMNS}
      FROM diagnoses
      WHERE id = ${id}
      `;
    return row || null;
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
