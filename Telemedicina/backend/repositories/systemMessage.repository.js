const sql = require('../config/db.config');

const SystemMessageRepository = {

  async create({ adminId, title, message, type = 'info', audience = 'all', valid_until, created_at }) {
    const [row] = await sql`
      INSERT INTO system_messages (
      "adminId", title, message, type, audience, valid_until, created_at
        ) VALUES (${adminId}, ${title}, ${message}, ${type}, ${audience}, ${valid_until}, COALESCE(${created_at}, NOW()))
      RETURNING
      id,
      "adminId" AS "adminId",
      title,
      message,
      "type",
      audience,
      created_at AS "created_at",
      valid_until AS "valid_until"
      `;
    return row;
  }
};


module.exports = SystemMessageRepository;
