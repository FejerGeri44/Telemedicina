const sql = require('../config/db.config');

const MessageRepository = {
  /**
   * list – üzenetek listázása szűrőkkel.
   * Szűrők: userId (bevonódó user – sender vagy receiver),
   * senderUserId, receiverUserId, onlyUnreadFor ('patient'|'doctor'),
   * since (iso/Date), until (iso/Date)
   */
  async list({ userId, senderUserId, receiverUserId, onlyUnreadFor, since, until, limit = 50, offset = 0 } = {}) {
    const where = [];
    if (userId != null) where.push(sql`(sender_user_id = ${userId} OR receiver_user_id = ${userId})`);
    if (senderUserId != null) where.push(sql`sender_user_id = ${senderUserId}`);
    if (receiverUserId != null) where.push(sql`receiver_user_id = ${receiverUserId}`);
    if (onlyUnreadFor === 'patient') where.push(sql`"isRead_patient" = false`);
    if (onlyUnreadFor === 'doctor') where.push(sql`"isRead_doctor" = false`);
    if (since) where.push(sql`"sendDate" >= ${since}`);
    if (until) where.push(sql`"sendDate" <= ${until}`);


    const rows = await sql`
SELECT
id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"sendDate" AS "sendDate",
"isRead_patient" AS "isReadPatient",
"isRead_doctor" AS "isReadDoctor",
"isDeleted_patient" AS "isDeletedPatient",
"isDeleted_doctor" AS "isDeletedDoctor"
FROM messages
${where.length ? sql`WHERE ${sql(where.join(' AND '))}` : sql``}
ORDER BY "sendDate" DESC, id DESC
LIMIT ${limit} OFFSET ${offset}
`;
    return rows;
  },

  async findById(id) {
    const [row] = await sql`
SELECT
id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"sendDate" AS "sendDate",
"isRead_patient" AS "isReadPatient",
"isRead_doctor" AS "isReadDoctor",
"isDeleted_patient" AS "isDeletedPatient",
"isDeleted_doctor" AS "isDeletedDoctor"
FROM messages
WHERE id = ${id}
`;
    return row || null;
  },


  /**
   * listConversation – két user közti thread időrendben.
   * hasBothDirections=true esetén mindkét irány bejön (alapértelmezett true).
   */
  async listConversation(aUserId, bUserId, { limit = 100, offset = 0, hasBothDirections = true } = {}) {
    const rows = await sql`
SELECT
id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"sendDate" AS "sendDate",
"isRead_patient" AS "isReadPatient",
"isRead_doctor" AS "isReadDoctor",
"isDeleted_patient" AS "isDeletedPatient",
"isDeleted_doctor" AS "isDeletedDoctor"
FROM messages
WHERE ${hasBothDirections
      ? sql`(sender_user_id = ${aUserId} AND receiver_user_id = ${bUserId})
OR (sender_user_id = ${bUserId} AND receiver_user_id = ${aUserId})`
      : sql`sender_user_id = ${aUserId} AND receiver_user_id = ${bUserId}`}
ORDER BY "sendDate" ASC, id ASC
LIMIT ${limit} OFFSET ${offset}
`;
    return rows;
  },

  async create({ senderUserId, receiverUserId, content, sendDate = null }) {
    const [row] = await sql`
INSERT INTO messages (
sender_user_id, receiver_user_id, content, "sendDate",
"isRead_patient", "isRead_doctor", "isDeleted_patient", "isDeleted_doctor"
) VALUES (
${senderUserId}, ${receiverUserId}, ${content}, COALESCE(${sendDate}, NOW()),
false, false, false, false
)
RETURNING
id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"sendDate" AS "sendDate",
"isRead_patient" AS "isReadPatient",
"isRead_doctor" AS "isReadDoctor",
"isDeleted_patient" AS "isDeletedPatient",
"isDeleted_doctor" AS "isDeletedDoctor"
`;
    return row;
  },


  /** markRead – olvasottnak jelölés a szerepkör szerint ('patient' | 'doctor'). */
  async markRead(messageId, forRole) {
    const col = forRole === 'doctor' ? '"isRead_doctor"' : '"isRead_patient"';
    const [row] = await sql`
UPDATE messages SET ${sql([`${col} = true`])}
WHERE id = ${messageId}
RETURNING id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"sendDate" AS "sendDate",
"isRead_patient" AS "isReadPatient",
"isRead_doctor" AS "isReadDoctor",
"isDeleted_patient" AS "isDeletedPatient",
"isDeleted_doctor" AS "isDeletedDoctor"
`;
    return row || null;
  },

  async softDelete(messageId, forRole) {
    const col = forRole === 'doctor' ? '"isDeleted_doctor"' : '"isDeleted_patient"';
    const [row] = await sql`
UPDATE messages SET ${sql([`${col} = true`])}
WHERE id = ${messageId}
RETURNING id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"sendDate" AS "sendDate",
"isRead_patient" AS "isReadPatient",
"isRead_doctor" AS "isReadDoctor",
"isDeleted_patient" AS "isDeletedPatient",
"isDeleted_doctor" AS "isDeletedDoctor"
`;
    return row || null;
  },


  /** deleteById – kemény törlés (ritkábban ajánlott, audit miatt). */
  async deleteById(id) {
    const [row] = await sql`DELETE FROM messages WHERE id = ${id} RETURNING id`;
    return !!row;
  }
};


module.exports = MessageRepository;
