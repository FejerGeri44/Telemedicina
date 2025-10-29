const sql5 = require('../config/db.config');

const DoctorRatingRepository = {
  async listByDoctor(doctorId, { limit = 100, offset = 0 } = {}) {
    return sql5`
      SELECT id, doctor_id AS "doctor_id", patient_id AS "patient_id", value
      FROM doctor_ratings
      WHERE doctor_id = ${doctorId}
      ORDER BY id DESC
        LIMIT ${limit}
      OFFSET ${offset}
    `;
  },

  async findByDoctorAndPatient(doctorId, patientId) {
    const [row] = await sql5`
      SELECT id, doctor_id AS "doctor_id", patient_id AS "patient_id", value
      FROM doctor_ratings
      WHERE doctor_id = ${doctorId} AND patient_id = ${patientId}
      `;
    return row || null;
  },

  async upsertAndRecomputeAverage({ doctor_id, patient_id, value }) {
    return await sql5.begin(async (tx) => {
      await tx`
      INSERT INTO doctor_ratings (doctor_id, patient_id, value)
      VALUES (${doctor_id}, ${patient_id}, ${value})
      ON CONFLICT (doctor_id, patient_id)
      DO UPDATE SET value = EXCLUDED.value
      `;

      const [agg] = await tx`
      SELECT AVG(value)::numeric(3,2) AS avg
      FROM doctor_ratings
      WHERE doctor_id = ${doctor_id}
      `;

      await tx`
      UPDATE doctors SET avg_rating = ${agg.avg}
      WHERE id = ${doctor_id}
      `;

      return { avgRating: agg.avg };
    });
  },

  async deleteByIdAndRecomputeAverage(id) {
    return await sql5.begin(async (tx) => {
      const [deleted] = await tx`
      DELETE FROM doctor_ratings WHERE id = ${id}
      RETURNING doctor_id
      `;
      if (!deleted) return false;
      const doctorId = deleted.doctor_id;
      const [agg] = await tx`
      SELECT AVG(value)::numeric(3,2) AS avg
      FROM doctor_ratings WHERE doctor_id = ${doctorId}
      `;
      await tx`
      UPDATE doctors SET avg_rating = ${agg.avg}
      WHERE id = ${doctorId}
      `;
      return true;
    });
  }
};


module.exports = DoctorRatingRepository;
