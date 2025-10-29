const sql = require('../config/db.config');

const AdminRepository = {
  async create({ userId, registDate = null }, client = sql) {
      const [row] = await client`
      INSERT INTO admins (userId, registDate)
      VALUES (${userId}, ${registDate})
      RETURNING id, userId AS "userId", registDate AS "registDate"
    `;
    return row;
  },

  async getByUserId(userId, client = sql) {
      const [row] = await client`
      SELECT id, userId AS "userId", registDate AS "registDate"
      FROM admins
      WHERE userId = ${userId}
    `;
    return row || null;
  },

  async deleteByUserId(userId, client = sql) {
      const [row] = await client`
      DELETE FROM admins
      WHERE userId = ${userId}
      RETURNING id
    `;
    return !!row;
  }
};

module.exports = AdminRepository;
