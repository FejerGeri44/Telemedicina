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
      console.error('❌ doctor_ratings insert error in repository:', err, { doctor_id, patient_id, valid_until });
      return null;
    }
  },

  async getActiveRatingRequestsByPatientId(patientId) {
    const now = new Date().toISOString();

    return sql`
      SELECT
        r.id AS rating_id,
        r.doctor_id,
        r.patient_id,
        r.value,
        r.valid_until,

        d.speciality,
        u.name AS doctor_name,
        u."pictureUrl" AS doctor_picture_url

      FROM doctor_ratings r
      JOIN doctors d ON r.doctor_id = d.id
      JOIN users u ON d."userId" = u.id

      WHERE r.patient_id = ${patientId}
        AND r.valid_until > ${now}
        AND r.value = 0
      ORDER BY r.valid_until ASC
    `;
  }
};

module.exports = DoctorRatingRepository;
