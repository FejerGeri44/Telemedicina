const sql = require('../config/db.config');

const DoctorRepository = {
  async create({ userId, speciality, introduction = null, avgRating = 0, registDate, status }, client = sql) {
      const [row] = await client`
      INSERT INTO doctors ("userId", speciality, introduction, "avgRating", "registDate", status)
      VALUES (${userId}, ${speciality}, ${introduction}, ${avgRating}, ${registDate}, ${status})
        RETURNING id,
        "userId" AS "userId",
        speciality, introduction,
        "avgRating" AS "avgRating",
        "registDate" AS "registDate",
        status
    `;
    return row;
  },

  async getByUserId(userId, client = sql) {
      const [row] = await client`
      SELECT id, "userId" AS "userId", speciality, introduction,
             "avgRating" AS "avgRating", "registDate" AS "registDate", status
      FROM doctors
      WHERE "userId" = ${userId}
    `;
    return row || null;
  },

  async deleteByUserId(userId, client = sql) {
      const [row] = await client`
      DELETE FROM doctors
      WHERE "userId" = ${userId}
      RETURNING id
    `;
    return !!row;
  }
};

module.exports = DoctorRepository;
