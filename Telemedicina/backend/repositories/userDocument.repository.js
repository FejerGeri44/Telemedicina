const sql = require('../config/db.config');

const UserDocumentRepository = {
  async listByPatientId(patientId) {
    return sql`
      SELECT id, doctor_id, patient_id, encounter_id, storage_path, created_at
      FROM user_documents
      WHERE patient_id = ${patientId}
      ORDER BY id ASC
    `;
  },

  async getByStoragePathAndPatientId({ storagePath, patientId }) {
    const [row] = await sql`
      SELECT id
      FROM user_documents
      WHERE storage_path = ${storagePath} AND patient_id = ${patientId}
      LIMIT 1
    `;
    return row || null;
  },


  async create(insertObj) {
    const { doctor_id, patient_id, encounter_id, storage_path } = insertObj;
    try {
      const [inserted] = await sql`
        INSERT INTO user_documents
          (doctor_id, patient_id, encounter_id, storage_path)
        VALUES
          (${doctor_id}, ${patient_id}, ${encounter_id}, ${storage_path})
        RETURNING *
      `;

      return inserted || null;

    } catch (err) {
      return null;
    }
  }
};

module.exports = UserDocumentRepository;
