const {findForAudiences} = require("../repositories/systemMessage.repository");
const MessageRepository = require("../repositories/message.repository");

exports.create = async (req, res) => {
  try {
    const senderUserId = parseInt(req.body.senderUserId);
    const receiverUserId = parseInt(req.body.receiverUserId);
    const content = req.body.content;

    if (isNaN(senderUserId) || isNaN(receiverUserId) || !content || content.trim() === '') {
      return res.status(400).json({ message: 'Hiányzó, vagy érvénytelen küldő/fogadó ID vagy tartalom.' });
    }

    const newMessage = await MessageRepository.create({
      senderUserId,
      receiverUserId,
      content: content.trim()
    });

    return res.status(201).json(newMessage);

  } catch (err) {
    console.error('❌ Üzenet küldése (create) hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba történt az üzenet küldésekor.' });
  }
};

exports.conversation = async (req, res) => {
  try {
    const callingUserId = req.user.id;
    const { patientId, doctorId } = req.body;
    if (!patientId || !doctorId) {
      return res.status(400).json({ message: 'Hiányzó páciens vagy orvos azonosító.' });
    }

    if (callingUserId !== patientId && callingUserId !== doctorId) {
      return res.status(403).json({ message: 'Nincs jogosultságod ehhez a beszélgetéshez.' });
    }

    const forRole = (callingUserId === patientId) ? 'patient' : 'doctor';
    const options = {
      forRole: forRole
    };

    const messages = await MessageRepository.listConversation(patientId, doctorId, options);
    return res.status(200).json(messages);

  } catch (err) {
    console.error('❌ Beszélgetés lekérése (conversation) hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba történt a beszélgetés lekérésekor.' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const callerId = req.user.id;
    const callerRole = req.user.role;

    let partnerId;
    let forRole;

    if (callerRole === 'patient') {
      partnerId = parseInt(req.body.doctorId);
      forRole = 'patient';
    } else if (callerRole === 'doctor') {
      partnerId = parseInt(req.body.patientId);
      forRole = 'doctor';
    } else {
      return res.status(403).json({ message: 'Ismeretlen vagy érvénytelen felhasználói szerepkör.' });
    }

    if (isNaN(callerId) || isNaN(partnerId)) {
      return res.status(400).json({ message: 'Érvénytelen felhasználói vagy partner azonosító.' });
    }

    const deletedIds = await MessageRepository.softDeleteConversationForUser(
      callerId,
      partnerId,
      forRole
    );

    return res.status(200).json({
      message: 'Beszélgetés törölve (soft delete).',
      deletedCount: deletedIds.length
    });

  } catch (err) {
    console.error('❌ Beszélgetés törlése hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba történt a törlés során.' });
  }
};

exports.getUnreadSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: 'Hitelesítés szükséges.' });
    }

    const summary = await MessageRepository.getUnreadSummaryForUser(userId);
    const mappedSummary = summary.map(row => ({
      partnerId: row.partnerId,
      unreadCount: parseInt(row.unreadCount, 10)
    }));

    return res.status(200).json(mappedSummary);

  } catch (err) {
    console.error('❌ Olvasatlan üzenetek lekérése hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba történt az összegzés során.' });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const receiverUserId = req.user.id;
    const partnerId = req.body.doctorId || req.body.patientId;

    if (!receiverUserId || !partnerId) {
      return res.status(400).json({ message: 'Hiányzó felhasználói vagy partner azonosító.' });
    }

    const updatedCount = await MessageRepository.markConversationAsReadForReceiver(
      receiverUserId,
      partnerId
    );

    return res.status(200).json({
      message: `${updatedCount} üzenet lett olvasottnak jelölve.`,
      updatedCount
    });

  } catch (err) {
    console.error('❌ Beszélgetés olvasottnak jelölése hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba történt az olvasottnak jelölés során.' });
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
