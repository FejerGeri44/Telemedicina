const sql = require('../config/db.config');

const EncounterRepository = {
  async create({ patientId, appointmentId = null, diagnosisId = null }, client = sql) {
    const [row] = await client`
      INSERT INTO encounters ("patient_id", "appointment_id", "diagnosis_id")
      VALUES (${patientId}, ${appointmentId}, ${diagnosisId})
      RETURNING id,
                "patient_id"    AS "patientId",
                "appointment_id" AS "appointmentId",
                "diagnosis_id"   AS "diagnosisId"
    `;
    return row;
  },

  async findById(id, client = sql) {
    const [row] = await client`
      SELECT id,
             "patient_id"     AS "patientId",
             "appointment_id" AS "appointmentId",
             "diagnosis_id"   AS "diagnosisId"
      FROM encounters
      WHERE id = ${id}
    `;
    return row || null;
  },

  async findAllByPatientId(patientId, client = sql) {
    return client`
      SELECT id,
             "patient_id"     AS "patientId",
             "appointment_id" AS "appointmentId",
             "diagnosis_id"   AS "diagnosisId"
      FROM encounters
      WHERE "patient_id" = ${patientId}
      ORDER BY id DESC
    `;
  },

  async updateById(id, { patientId, appointmentId, diagnosisId }, client = sql) {
    const sets = [];
    if (patientId !== undefined)    sets.push(client`"patient_id" = ${patientId}`);
    if (appointmentId !== undefined) sets.push(client`"appointment_id" = ${appointmentId}`);
    if (diagnosisId !== undefined)   sets.push(client`"diagnosis_id" = ${diagnosisId}`);

    if (sets.length === 0) {
      return this.findById(id, client);
    }

    const [row] = await client`
      UPDATE encounters
      SET ${client(sets)}
      WHERE id = ${id}
      RETURNING id,
                "patient_id"     AS "patientId",
                "appointment_id" AS "appointmentId",
                "diagnosis_id"   AS "diagnosisId"
    `;
    return row || null;
  },

  async deleteById(id, client = sql) {
    const [row] = await client`
      DELETE FROM encounters
      WHERE id = ${id}
      RETURNING id
    `;
    return !!row;
  },
};

module.exports = EncounterRepository;
