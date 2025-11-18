const sql = require('../config/db.config');

const PatientRepository = {
  async create({ userId, gender, height = null, weight = null, birthDate, taj = null, homePhone = null, registDate = null }, client = sql) {
      const [row] = await client`
      INSERT INTO patients ("userId", gender, height, weight, "birthDate", taj, "homePhone", "registDate")
      VALUES (${userId}, ${gender}, ${height}, ${weight}, ${birthDate}, ${taj}, ${homePhone}, ${registDate})
      RETURNING id,
                "userId" AS "userId",
                gender, height, weight,
                "birthDate" as "birthDate",
                 taj,
                "homePhone" AS "homePhone",
                "registDate" AS "registDate"
    `;
    return row;
  },

  async updatePatientProfile(userId, userFields, patientFields, tagsParsed, PatientTagRepository, supabaseAdmin, client = sql) {

    if (Object.keys(userFields).length) {
      const { error } = await supabaseAdmin.from('users').update(userFields).eq('id', userId);
      if (error) throw error;
    }

    if (Object.keys(patientFields).length) {
      const { error } = await supabaseAdmin.from('patients').update(patientFields).eq('userId', userId);
      if (error) throw error;
    }

    const { data: patientRow, error: patErr } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('userId', userId)
      .single();

    if (patErr || !patientRow) {
      throw new Error('Nincs patient rekord ehhez a userhez.');
    }
    const patientId = patientRow.id;

    if (Array.isArray(tagsParsed)) {
      const cleaned = tagsParsed
        .filter(t => t && t.name && t.value)
        .map(t => ({
          tagName: String(t.name).trim(),
          tagValue: String(t.value).trim()
        }));

      await PatientTagRepository.replaceForPatient(patientId, cleaned);
    }

    const { data: userRow, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (fetchErr) throw fetchErr;
    if (!userRow) throw new Error('User not found');

    return { userRow, patientId };
  },

  async getByUserId(userId, client = sql) {
      const [row] = await client`
      SELECT id, "userId" AS "userId", gender, height, weight, "birthDate" AS "birthDate", taj,
             "homePhone" AS "homePhone", "registDate" AS "registDate"
      FROM patients
      WHERE "userId" = ${userId}
    `;
    return row || null;
  },

  async listPatientsWithUsersById(patientId, client = sql) {
    const ids = Array.isArray(patientIds) ? patientIds : [patientIds];

    if (ids.length === 0) {
      return [];
    }

    const rows = await client`
    SELECT
      p.id AS patient_id,
      p."userId" AS patient_user_id,
      p.gender AS patient_gender,
      p.height AS patient_height,
      p.weight AS patient_weight,
      p."birthDate" AS patient_birth_date,
      p.taj AS patient_taj,
      p."homePhone" AS patient_home_phone,
      p."registDate" AS patient_regist_date,

      u.id AS user_id,
      u.email AS user_email,
      u.name AS user_name,
      u.role AS user_role,
      u."phoneNumber" AS user_phone_number,
      u.address AS user_address,
      u."pictureUrl" AS user_picture_url

    FROM patients p
    JOIN users u ON p."userId" = u.id
    WHERE p.id IN (${sql.array(ids)})
  `;

    return rows.map(row => ({
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        role: row.user_role,
        phoneNumber: row.user_phone_number,
        address: row.user_address,
        pictureUrl: row.user_picture_url,
      },
      patient: {
        id: row.patient_id,
        userId: row.patient_user_id,
        gender: row.patient_gender,
        height: row.patient_height,
        weight: row.patient_weight,
        birthDate: row.patient_birth_date,
        taj: row.patient_taj,
        homePhone: row.patient_home_phone,
        registDate: row.patient_regist_date,
      },
    }));
  },

};

module.exports = PatientRepository;
