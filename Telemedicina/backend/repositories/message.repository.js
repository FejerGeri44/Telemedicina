const sql = require('../config/db.config');

const MessageRepository = {
  async list({ userId, senderUserId, receiverUserId, onlyUnreadFor, since, until, limit = 50, offset = 0 } = {}) {
    const where = [];
    if (userId != null) where.push(sql`(sender_user_id = ${userId} OR receiver_user_id = ${userId})`);
    if (senderUserId != null) where.push(sql`sender_user_id = ${senderUserId}`);
    if (receiverUserId != null) where.push(sql`receiver_user_id = ${receiverUserId}`);
    if (onlyUnreadFor === 'patient') where.push(sql`"isRead_sender" = false`);
    if (onlyUnreadFor === 'doctor') where.push(sql`"isRead_receiver" = false`);
    if (since) where.push(sql`"send_date" >= ${since}`);
    if (until) where.push(sql`"send_date" <= ${until}`);


    return sql`
      SELECT id,
             sender_user_id       AS "senderUserId",
             receiver_user_id     AS "receiverUserId",
             content,
             "send_date"          AS "send_date",
             "isRead_sender"      AS "isReadPatient",
             "isRead_receiver"    AS "isReadDoctor",
             "isDeleted_sender"   AS "isDeletedPatient",
             "isDeleted_receiver" AS "isDeletedDoctor"
      FROM messages ${where.length ? sql`WHERE
      ${sql(where.join(' AND '))}` : sql``}
      ORDER BY "send_date" DESC, id DESC
        LIMIT ${limit}
      OFFSET ${offset}
    `;
  },

  async findById(id) {
    const [row] = await sql`
SELECT
id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"send_date" AS "send_date",
"isRead_sender" AS "isReadPatient",
"isRead_receiver" AS "isReadDoctor",
"isDeleted_sender" AS "isDeletedPatient",
"isDeleted_receiver" AS "isDeletedDoctor"
FROM messages
WHERE id = ${id}
`;
    return row || null;
  },

  async listConversation(aUserId, bUserId, { limit = 100, offset = 0, hasBothDirections = true, forRole } = {}) {
    let deleteFilter = sql``;
    if (forRole === 'patient') {
      deleteFilter = sql` AND "isDeleted_sender" = false`;
    } else if (forRole === 'doctor') {
      deleteFilter = sql` AND "isDeleted_receiver" = false`;
    }

    return sql`
      SELECT id,
             sender_user_id      AS "senderUserId",
             receiver_user_id    AS "receiverUserId",
             content,
             "send_date"         AS "send_date",
             "isRead_sender"     AS "isReadPatient",
             "isRead_receiver"   AS "isReadDoctor",
             "isDeleted_sender"  AS "isDeletedPatient",
             "isDeleted_receiver" AS "isDeletedDoctor"
      FROM messages
      WHERE (
              ${hasBothDirections
      ? sql`(sender_user_id = ${aUserId} AND receiver_user_id = ${bUserId})
                      OR (sender_user_id =
                      ${bUserId}
                      AND
                      receiver_user_id
                      =
                      ${aUserId}
                      )`
      : sql`sender_user_id
                =
                ${aUserId}
                AND
                receiver_user_id
                =
                ${bUserId}`}
              )
        ${deleteFilter}
      ORDER BY "send_date" ASC, id ASC
        LIMIT ${limit}
      OFFSET ${offset}
    `;
  },

  async create({ senderUserId, receiverUserId, content, send_date = null }) {
    const [row] = await sql`
      INSERT INTO messages (
        sender_user_id, receiver_user_id, content, "send_date",
        "isRead_sender", "isRead_receiver", "isDeleted_sender", "isDeleted_receiver"
      ) VALUES (
                 ${senderUserId}, ${receiverUserId}, ${content}, COALESCE(${send_date}, NOW()),
                 TRUE, FALSE,
                 false, false
               )
        RETURNING
id,
sender_user_id AS "senderUserId",
receiver_user_id AS "receiverUserId",
content,
"send_date" AS "send_date",
"isRead_sender" AS "isReadPatient",
"isRead_receiver" AS "isReadDoctor",
"isDeleted_sender" AS "isDeletedPatient",
"isDeleted_receiver" AS "isDeletedDoctor"
    `;
    return row;
  },

  async getUnreadSummaryForUser(userId) {
    return sql`
      SELECT sender_user_id AS "partnerId",
             COUNT(id)      AS "unreadCount"
      FROM messages
      WHERE receiver_user_id = ${userId}
        AND "isRead_receiver" = FALSE
        AND "isDeleted_receiver" = FALSE
      GROUP BY sender_user_id
    `;
  },


  async markConversationAsReadForReceiver(receiverUserId, senderUserId) {
    const [rows] = await sql`
      UPDATE messages
      SET "isRead_receiver" = TRUE
      WHERE
        receiver_user_id = ${receiverUserId}
        AND sender_user_id = ${senderUserId}
        AND "isRead_receiver" = FALSE
      RETURNING id
    `;

    return Array.isArray(rows) ? rows.length : 0;
    },


  async softDeleteConversationForUser(userId, partnerId, forRole) {
    const col = forRole === 'patient' ? '"isDeleted_sender"' : '"isDeleted_receiver"';

    const rows = await sql`
    UPDATE messages
    SET ${sql.unsafe([`${col} = true`])}
    WHERE (sender_user_id = ${userId} AND receiver_user_id = ${partnerId})
       OR (sender_user_id = ${partnerId} AND receiver_user_id = ${userId})
    RETURNING id
  `;
    return rows.map(r => r.id);
  },


  async deleteById(id) {
    const [row] = await sql`DELETE FROM messages WHERE id = ${id} RETURNING id`;
    return !!row;
  }
};


module.exports = MessageRepository;
