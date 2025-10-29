const sql = require('../config/db.config');

const SystemMessageRepository = {

  async create({ adminId, title, message, type = 'info', audience = 'all', createdAt = null, validUntil = null }) {
    const [row] = await sql`
INSERT INTO system_messages (
admin_id, title, message, type, audience, created_at, valid_until
) VALUES (
${adminId}, ${title}, ${message}, ${type}, ${audience}, COALESCE(${createdAt}, NOW()), ${validUntil}
)
RETURNING
id,
admin_id AS "adminId",
title,
message,
type,
audience,
created_at AS "createdAt",
valid_until AS "validUntil"
`;
    return row;
  }
};


module.exports = SystemMessageRepository;
