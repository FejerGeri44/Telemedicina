const sql = require('../config/db.config');

const AppointmentRejectionRepository = {

  async create({ doctorId, patientId, rejectionDate = new Date().toISOString() }, client = sql) {
    const [row] = await client`
      INSERT INTO appointment_rejection ("doctor_id", "patient_id", "rejection_date")
      VALUES (${doctorId}, ${patientId}, ${rejectionDate})
      RETURNING id, "doctor_id" AS "doctorId", "patient_id" AS "patientId", "rejection_date" AS "rejectionDate"
    `;
    return row;
  },

  async getByDoctorId(doctorId, client = sql) {
    return client`
      SELECT id, "doctor_id" AS "doctorId", "patient_id" AS "patientId", "rejection_date" AS "rejectionDate"
      FROM appointment_rejection
      WHERE "doctor_id" = ${doctorId}
      ORDER BY "rejection_date" DESC
    `;
  },

  async getByPatientId(patientId, client = sql) {
    return client`
      SELECT id, "doctor_id" AS "doctorId", "patient_id" AS "patientId", "rejection_date" AS "rejectionDate"
      FROM appointment_rejection
      WHERE "patient_id" = ${patientId}
      ORDER BY "rejection_date" DESC
    `;
  },

};

module.exports = AppointmentRejectionRepository;
