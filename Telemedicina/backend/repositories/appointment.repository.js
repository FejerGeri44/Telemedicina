const sql2 = require('../config/db.config');

const AppointmentRepository = {
  async list({ doctorId, patientId, status, from, to, limit = 50, offset = 0 } = {}) {
    const where = [];
    if (doctorId != null) where.push(sql2`doctor_id = ${doctorId}`);
    if (patientId != null) where.push(sql2`patient_id = ${patientId}`);
    if (status != null) where.push(sql2`status = ${status}`);
    if (from) where.push(sql2`starts_at >= ${from}`);
    if (to) where.push(sql2`ends_at <= ${to}`);

    return sql2`
      SELECT id,
             doctor_id  AS "doctor_id",
             patient_id AS "patient_id",
             starts_at,
             ends_at,
             status
      FROM appointments ${where.length ? sql2`WHERE ${sql2(where.join(' AND '))}` : sql2``}
      ORDER BY starts_at ASC
        LIMIT ${limit}
      OFFSET ${offset}
    `;
  },

  async findById(id) {
    const [row] = await sql2`
      SELECT id, doctor_id AS "doctor_id", patient_id AS "patient_id",
      starts_at, ends_at, status
      FROM appointments
      WHERE id = ${id}
      `;
    return row || null;
  },

  async create({ doctor_id, patient_id = null, starts_at, ends_at, status = 'free' }) {
    const [row] = await sql2`
      INSERT INTO appointments (doctor_id, patient_id, starts_at, ends_at, status)
      VALUES (${doctor_id}, ${patient_id}, ${starts_at}, ${ends_at}, ${status})
      RETURNING id, doctor_id AS "doctor_id", patient_id AS "patient_id",
      starts_at, ends_at, status
      `;
    return row;
  },

  async updateById(id, fields) {
    const sets = [];
    if (fields.doctor_id !== undefined) sets.push(sql2`doctor_id = ${fields.doctor_id}`);
    if (fields.patient_id !== undefined) sets.push(sql2`patient_id = ${fields.patient_id}`);
    if (fields.starts_at !== undefined) sets.push(sql2`starts_at = ${fields.starts_at}`);
    if (fields.ends_at !== undefined) sets.push(sql2`ends_at = ${fields.ends_at}`);
    if (fields.status !== undefined) sets.push(sql2`status = ${fields.status}`);
    if (!sets.length) return await this.findById(id);

    const [row] = await sql2`
      UPDATE appointments SET ${sql2(sets.join(', '))}
      WHERE id = ${id}
      RETURNING id, doctor_id AS "doctor_id", patient_id AS "patient_id",
      starts_at, ends_at, status
      `;
    return row || null;
  },

  async deleteById(id) {
    const [row] = await sql2`
      DELETE FROM appointments WHERE id = ${id} RETURNING id
      `;
    return !!row;
  }
};

module.exports = AppointmentRepository;
