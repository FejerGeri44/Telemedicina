const sql = require('../config/db.config');

const PatientTagRepository = {
  async create({ patientId, tagName, tagValue }) {
    const [row] = await sql`
      INSERT INTO patient_tags (patient_id, tag_name, tag_value)
      VALUES (${patientId}, ${tagName}, ${tagValue})
        RETURNING
        id,
        patient_id AS "patientId",
        tag_name   AS "tagName",
        tag_value  AS "tagValue"
    `;
    return row;
  },

  async getByPatientId(patientId) {
    const rows = await sql`
    SELECT
      id,
      patient_id AS "patientId",
      tag_name   AS "tagName",
      tag_value  AS "tagValue"
    FROM patient_tags
    WHERE patient_id = ${patientId}
  `;
    return rows || [];
  },

  async replaceForPatient(patientId, tags) {
    await sql.begin(async (trx) => {
      await trx`DELETE FROM patient_tags WHERE patient_id = ${patientId}`;

      if (Array.isArray(tags) && tags.length) {
        const rows = tags.map(t => ({
          patient_id: patientId,
          tag_name:   t.tagName,
          tag_value:  t.tagValue
        }));

        await trx`
          INSERT INTO patient_tags ${trx(rows, 'patient_id', 'tag_name', 'tag_value')}
        `;
      }
    });
  }
};

module.exports = PatientTagRepository;
