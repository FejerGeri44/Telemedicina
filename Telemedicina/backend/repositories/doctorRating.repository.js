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

  async getActiveRatingRequestsByPatientId(patientId) {
    const now = new Date().toISOString();

    return sql`
      SELECT r.id           AS rating_id,
             r.doctor_id,
             r.patient_id,
             r.value,
             r.valid_until,

             d.speciality,
             u.name         AS doctor_name,
             u."pictureUrl" AS doctor_picture_url

      FROM doctor_ratings r
             JOIN doctors d ON r.doctor_id = d.id
             JOIN users u ON d."userId" = u.id

      WHERE r.patient_id = ${patientId}
        AND r.valid_until > ${now}
        AND r.value = 0
      ORDER BY r.valid_until
    `;
  },

  async listActiveRatingRequestsWithDetails({ patientId, getPatientFunc, getDoctorFunc }) {

    const rawRatingRequests = await DoctorRatingRepository.getActiveRatingRequestsByPatientId(patientId);

    if (!rawRatingRequests || rawRatingRequests.length === 0) {
      return [];
    }

    const patientItem = await getPatientFunc(patientId);

    if (!patientItem) {
      throw { type: 'NotFoundError', message: 'Páciens adatok nem találhatók.', code: 404 };
    }

    const doctorIds = [...new Set(rawRatingRequests.map(r => r.doctor_id))];

    const doctorItemPromises = doctorIds.map(docId => getDoctorFunc(docId));
    const doctorItems = await Promise.all(doctorItemPromises);
    const doctorDataMap = new Map();
    doctorItems.forEach(item => {
      if (item) doctorDataMap.set(item.doctor.id, item);
    });

    return rawRatingRequests
      .map(raw => {
        const doctorItem = doctorDataMap.get(raw.doctor_id);

        if (!doctorItem) return null;

        return {
          id: raw.rating_id,
          doctor: doctorItem,
          patient: patientItem,
          value: raw.value,
          valid_until: raw.valid_until,
        };
      })
      .filter(item => item !== null);
  }
};

module.exports = DoctorRatingRepository;
