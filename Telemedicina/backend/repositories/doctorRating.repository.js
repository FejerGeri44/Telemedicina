const sql = require("../config/db.config");

const DoctorRatingRepository = {
  async create({ doctor_id, patient_id, value, valid_until }) {

    try {
      const [inserted] = await sql`
        INSERT INTO doctor_ratings
          (doctor_id, patient_id, value, valid_until)
        VALUES
          (${doctor_id}, ${patient_id}, ${value}, ${valid_until})
        RETURNING *
      `;

      return inserted || null;

    } catch (err) {
      console.error('❌ doctor_ratings INSERT hiba:', err, { doctor_id, patient_id, valid_until });
      throw err;
    }
  },

  async findByDoctorAndPatient(doctorId, patientId, client = sql) {
    const [row] = await client`
            SELECT id, doctor_id, patient_id, value, valid_until
            FROM doctor_ratings
            WHERE doctor_id = ${doctorId} AND patient_id = ${patientId}
            LIMIT 1
        `;
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
      value: row.value,
      comment: row.comment,
      valid_until: row.valid_until,
    };
  },

  async findActiveRequestsByPatientId(patientId, client = sql) {
    return client`
      SELECT id,
             doctor_id,
             patient_id,
             value,
             valid_until
      FROM doctor_ratings
      WHERE patient_id = ${patientId}
        AND valid_until > NOW()
        AND value = 0
    `;
  },

  async updateRatingValue(ratingId, value, client = sql) {
    const [updated] = await client`
      UPDATE doctor_ratings
      SET value = ${value}
      WHERE id = ${ratingId}
      RETURNING *
    `;
    return updated;
  },

  async getCompletedRatingsByDoctorId(doctorId, client = sql) {
    return client`
      SELECT value
      FROM doctor_ratings
      WHERE doctor_id = ${doctorId}
        AND value > 0
    `;
  }
};

module.exports = DoctorRatingRepository;
