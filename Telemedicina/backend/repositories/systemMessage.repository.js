const sql = require('../config/db.config');

const SystemMessageRepository = {
  async create({ adminId, title, message, type, audience, valid_until, created_at }) {
    const [inserted] = await sql`
      INSERT INTO system_messages
        ("adminId", title, message, type, audience, "valid_until", "created_at")
      VALUES
        (${adminId}, ${title}, ${message}, ${type}, ${audience}, ${valid_until}, ${created_at})
      RETURNING id,
                "adminId" AS "adminId",
                title,
                message,
                type,
                audience,
                "valid_until" AS "validUntil",
                "created_at" AS "createdAt"
    `;
    return inserted;
  },

  async listWithAdminDetails(supabaseAdmin) {
    const { data: messages, error: mErr } = await supabaseAdmin
      .from('system_messages')
      .select('id, adminId, title, message, type, audience, valid_until, created_at')
      .order('created_at', { ascending: false });
    if (mErr) {
      throw { type: 'DatabaseError', message: 'Rendszerüzenetek lekérdezési hiba.', error: String(mErr.message || mErr), code: 500 };
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    const adminIds = Array.from(new Set(messages.map(m => m.adminId).filter(Boolean)));
    const { data: admins, error: aErr } = await supabaseAdmin
      .from('admins')
      .select('id, userId, registDate');
    if (aErr) {
      throw { type: 'DatabaseError', message: 'Admin adatok lekérdezési hiba.', error: String(aErr.message || aErr), code: 500 };
    }

    const userIds = Array.from(new Set((admins ?? []).map(a => a.userId).filter(Boolean)));
    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, phoneNumber, address, pictureUrl')
      .in('id', userIds);
    if (uErr) {
      throw { type: 'DatabaseError', message: 'Admin User adatok lekérdezési hiba.', error: String(uErr.message || uErr), code: 500 };
    }

    const adminMap = new Map((admins ?? []).map(a => [a.id, a]));
    const userMap  = new Map((users ?? []).map(u => [u.id, u]));

    return messages.map(m => {
      const a = adminMap.get(m.adminId);
      const u = a ? userMap.get(a.userId) : undefined;

      return {
        id: m.id,
        adminId: m.adminId,
        title: m.title,
        message: m.message,
        type: m.type,
        audience: m.audience,
        valid_until: m.valid_until ?? null,
        created_at: m.created_at,
        admin: {
          user: u ? {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            phoneNumber: u.phoneNumber,
            address: u.address ?? null,
            pictureUrl: u.pictureUrl ?? null
          } : null,
          admin: a ? {
            id: a.id,
            userId: a.user_id,
            registDate: a.registDate
          } : null
        }
      };
    });
  },

  async deleteById(messageId, supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from('system_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      if (error.code === 'PGRST116') {
        throw { type: 'NotFoundError', message: 'Rendszerüzenet nem található.', code: 404 };
      }
      console.error('❌ Supabase delete error:', error);
      throw { type: 'DatabaseError', message: 'Adatbázis hiba a törlés közben.', code: 500, error: String(error.message || error) };
    }
    return { id: messageId };
  },

  async findForAudiences(effectiveAudiences) {
    return sql`
      SELECT id,
             "adminId",
             title,
             message,
             type,
             audience,
             "created_at"  AS "createdAt",
             "valid_until" AS "validUntil"
      FROM system_messages
      WHERE audience IN ${sql(effectiveAudiences)}
        AND ("valid_until" IS NULL OR "valid_until" >= NOW())
      ORDER BY "created_at" DESC
    `;
  }
};

module.exports = SystemMessageRepository;
