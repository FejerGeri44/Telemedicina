const {
  User,
  Message,
  sequelize
} = require('../repositories');
const {Op} = require("sequelize");
const {findForAudiences} = require("../repositories/systemMessage.repository");

exports.sendMessage = async (req, res) => {
  try {
    const senderUserId = req.user.id;
    const toUserId = Number(req.body?.toUserId || 0);
    const content  = (req.body?.content || '').trim();
    const role     = String(req.body?.role || '').toLowerCase();

    if (!toUserId || !content) {
      return res.status(400).json({ error: 'toUserId és content kötelező' });
    }
    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Érvénytelen role (patient | doctor)' });
    }
    if (toUserId === senderUserId) {
      return res.status(400).json({ error: 'Magadnak nem küldhetsz üzenetet.' });
    }

    const receiverExists = await User.findByPk(toUserId, { attributes: ['id'] });
    if (!receiverExists) {
      return res.status(404).json({ error: 'A címzett nem található.' });
    }

    // Új üzenet olvasottsági flagjei a küldő szerepe alapján
    // (a küldőnek rögtön "olvasott", a másik félnek "nem olvasott")
    const isReadPatient = role === 'patient';
    const isReadDoctor  = role === 'doctor';

    const msg = await Message.create({
      senderUserId,
      receiverUserId: toUserId,
      content,
      isReadPatient,
      isReadDoctor
      // isDeletedPatient / isDeletedDoctor alapértelmezetten false az adatbázisban
    });

    return res.status(201).json(msg);
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'Nem sikerült elküldeni az üzenetet.' });
  }
};

exports.getMyMessages = async (req, res) => {
  try {
    const userId = Number(req.body?.userId);
    const role = String(req.body?.role || '').toLowerCase();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Érvénytelen userId' });
    }
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Nincs jogosultság' });
    }
    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Érvénytelen role (patient vagy doctor szükséges)' });
    }

    const limit  = Math.min(Number(req.body?.limit || 200), 500);
    const before = req.body?.before ? new Date(req.body.before) : null;
    const after  = req.body?.after  ? new Date(req.body.after)  : null;

    const where = {
      [Op.or]: [{ senderUserId: userId }, { receiverUserId: userId }],
      ...(role === 'patient'
        ? { isDeletedPatient: false }
        : { isDeletedDoctor: false })
    };

    if (before && after) where.sendDate = { [Op.between]: [after, before] };
    else if (before) where.sendDate = { [Op.lt]: before };
    else if (after) where.sendDate = { [Op.gt]: after };

    const rows = await Message.findAll({
      where,
      order: [['sendDate', 'ASC'], ['id', 'ASC']],
      limit
    });

    return res.json(rows);
  } catch (err) {
    console.error('getMessagesByUser error:', err);
    return res.status(500).json({ error: 'Nem sikerült lekérni az üzeneteket.' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const meId    = Number(req.body?.meUserId);
    const otherId = Number(req.body?.otherUserId);
    const role = String(req.body?.role || '').toLowerCase();

    if (!Number.isInteger(meId) || !Number.isInteger(otherId) || meId <= 0 || otherId <= 0 || meId === otherId) {
      return res.status(400).json({ error: 'Érvénytelen meUserId / otherUserId' });
    }
    if (req.user?.id !== meId) {
      return res.status(403).json({ error: 'Nincs jogosultság' });
    }

    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Érvénytelen role (patient vagy doctor szükséges)' });
    }

    const whereConversation = {
      [Op.or]: [
        { senderUserId: meId,   receiverUserId: otherId },
        { senderUserId: otherId, receiverUserId: meId   }
      ]
    };

    // tranzakció: soft delete + hard delete ahol mindkettő true
    const result = await sequelize.transaction(async (t) => {
      // 1) szerep szerinti soft delete
      const setFields =
        role === 'patient'
          ? { isDeletedPatient: true }
          : { isDeletedDoctor: true };

      // opcionális: ne írjuk feleslegesen újra a már true értéket
      const roleFlagFilter =
        role === 'patient'
          ? { isDeletedPatient: false }
          : { isDeletedDoctor: false };

      const [softUpdatedCount] = await Message.update(
        setFields,
        {
          where: { ...whereConversation, ...roleFlagFilter },
          transaction: t
        }
      );

      // 2) hard delete azoknál, ahol mindkét flag true
      const hardDeletedCount = await Message.destroy({
        where: {
          ...whereConversation,
          isDeletedPatient: true,
          isDeletedDoctor: true
        },
        transaction: t
      });

      return { softUpdatedCount, hardDeletedCount };
    });

    return res.json({
      ok: true,
      softUpdated: result.softUpdatedCount,
      hardDeleted: result.hardDeletedCount
    });

  } catch (err) {
    console.error('deleteConversation error:', err);
    return res.status(500).json({ error: 'Nem sikerült törölni a beszélgetést.' });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const myUserId   = Number(req.body?.myUserId);
    const withUserId = Number(req.body?.withUserId);
    const role = String(req.body?.role || '').toLowerCase();

    // Alap validáció
    if (!Number.isInteger(myUserId) || !Number.isInteger(withUserId) ||
      myUserId <= 0 || withUserId <= 0 || myUserId === withUserId) {
      return res.status(400).json({ error: 'Érvénytelen myUserId / withUserId' });
    }
    if (req.user?.id !== myUserId) {
      return res.status(403).json({ error: 'Nincs jogosultság' });
    }
    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Érvénytelen role (patient | doctor)' });
    }

    // Beszélgetés szűrő
    const whereConversation = {
      [Op.or]: [
        { senderUserId: myUserId,   receiverUserId: withUserId },
        { senderUserId: withUserId, receiverUserId: myUserId   }
      ]
    };

    // Melyik oszlopot állítjuk?
    const setFields = role === 'patient'
      ? { isReadPatient: true }
      : { isReadDoctor: true };

    // Ne írjuk feleslegesen újra a már true értéket
    const onlyNotYetRead = role === 'patient'
      ? { isReadPatient: false }
      : { isReadDoctor: false };

    const [updatedCount] = await Message.update(
      setFields,
      {
        where: { ...whereConversation, ...onlyNotYetRead }
      }
    );

    return res.json({ ok: true, updated: updatedCount });
  } catch (err) {
    console.error('markConversationAsRead error:', err);
    return res.status(500).json({ error: 'Nem sikerült olvasottnak jelölni a beszélgetést.' });
  }
};

exports.getUnreadMessages = async (req, res) => {
  try {
    const userId = Number(req.body?.userId);
    const role   = String(req.body?.role || '').toLowerCase();
    const limit  = Math.min(Number(req.body?.limit || 200), 500);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Érvénytelen userId' });
    }
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Nincs jogosultság' });
    }
    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Érvénytelen role (patient | doctor)' });
    }

    const unreadFlag   = role === 'patient' ? { isReadPatient: false } : { isReadDoctor: false };
    const notDeletedBy = role === 'patient' ? { isDeletedPatient: false } : { isDeletedDoctor: false };

    const where = {
      [Op.or]: [{ senderUserId: userId }, { receiverUserId: userId }],
      ...unreadFlag,
      ...notDeletedBy
    };

    const rows = await Message.findAll({
      where,
      order: [['sendDate', 'DESC'], ['id', 'DESC']],
      limit
    });

    return res.json({
      unread: rows,
      count: rows.length
    });
  } catch (err) {
    console.error('getUnreadMessages error:', err);
    return res.status(500).json({ error: 'Nem sikerült lekérni az olvasatlan üzeneteket.' });
  }
};

exports.getSystemMessagesForMe = async (req, res) => {
  try {
    let { audiences } = req.body || {};
    if (!Array.isArray(audiences)) audiences = [];

    const normalized = [...new Set(audiences.map(a => String(a).trim().toLowerCase()))];
    const effectiveAudiences = normalized.length ? [...new Set([...normalized, 'all'])] : ['all'];

    const rows = await findForAudiences(effectiveAudiences);

    const messages = rows.map(row => ({
      id: row.id,
      adminId: row.adminId,
      title: row.title,
      message: row.message,
      audience: row.audience,
      type: row.type,
      created_at: new Date(row.createdAt).toISOString(),
      valid_until: row.validUntil ? new Date(row.validUntil).toISOString() : null
    }));

    return res.status(200).json(messages);
  } catch (err) {
    console.error('❌ getSystemMessagesForMe hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};
