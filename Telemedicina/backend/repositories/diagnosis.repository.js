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

  async updateById(id, fields) {
    const sets = [];
    const map = {
      appointmentId: 'appointment_id', patientId: 'patient_id', doctorId: 'doctor_id',
      chiefComplaint: 'chief_complaint', onsetDate: 'onset_date', history: 'history',
      bpSys: 'bp_sys', bpDia: 'bp_dia', heartRate: 'heart_rate', tempC: 'temp_c', spo2: 'spo2',
      weightKg: 'weight_kg', heightCm: 'height_cm', bmi: 'bmi', examSummary: 'exam_summary',
      primaryText: 'primary_text', codeSystem: 'code_system', code: 'code', certaintyPct: 'certainty_pct',
      severity: 'severity', differentials: 'differentials', assessment: 'assessment', planText: 'plan_text',
      redFlags: 'red_flags', informed: 'informed'
    };
    for (const [k, v] of Object.entries(fields)) {
      if (map[k]) sets.push(sql3([`${map[k]} = $1`], [v]));
    }
    if (!sets.length) return await this.findById(id);
    const [row] = await sql3`
      UPDATE diagnoses SET ${sql3(sets.join(', '))}
      WHERE id = ${id}
      RETURNING ${SELECT_COLUMNS}
      `;
    return row || null;
  },

  async deleteById(id) {
    const [row] = await sql3`DELETE FROM diagnoses WHERE id = ${id} RETURNING id`;
    return !!row;
  }
};

module.exports = DiagnosisRepository;
