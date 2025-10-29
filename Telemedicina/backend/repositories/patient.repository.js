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

  async getByUserId(userId, client = sql) {
      const [row] = await client`
      SELECT id, "userId" AS "userId", gender, height, weight, "birthDate" AS "birthDate", taj,
             "homePhone" AS "homePhone", "registDate" AS "registDate"
      FROM patients
      WHERE "userId" = ${userId}
    `;
    return row || null;
  },

  async deleteByUserId(userId, client = sql) {
      const [row] = await client`
      DELETE FROM patients
      WHERE "userId" = ${userId}
      RETURNING id
    `;
    return !!row;
  }
};

module.exports = PatientRepository;
