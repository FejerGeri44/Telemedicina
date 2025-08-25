const {
  User,
  Message,
  sequelize
} = require('../models');
const {Op} = require("sequelize");

exports.sendMessage = async (req, res) => {
  try {
    const senderUserId = req.user.id;
    const toUserId = Number(req.body?.toUserId || 0);
    const content  = (req.body?.content || '').trim();

    if (!toUserId || !content) {
      return res.status(400).json({ error: 'toUserId és content kötelező' });
    }
    if (toUserId === senderUserId) {
      return res.status(400).json({ error: 'Magadnak nem küldhetsz üzenetet.' });
    }

    const receiverExists = await User.findByPk(toUserId, { attributes: ['id'] });
    if (!receiverExists) {
      return res.status(404).json({ error: 'A címzett nem található.' });
    }

    const msg = await Message.create({
      senderUserId,
      receiverUserId: toUserId,
      content
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
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Érvénytelen userId' });
    }

    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Nincs jogosultság' });
    }

    const limit  = Math.min(Number(req.body?.limit || 200), 500);
    const before = req.body?.before ? new Date(req.body.before) : null;
    const after  = req.body?.after  ? new Date(req.body.after)  : null;

    const where = {
      [Op.or]: [{ senderUserId: userId }, { receiverUserId: userId }]
    };
    if (before && after) where.sendDate = { [Op.between]: [after, before] };
    else if (before)     where.sendDate = { [Op.lt]: before };
    else if (after)      where.sendDate = { [Op.gt]: after };

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

    if (!Number.isInteger(meId) || !Number.isInteger(otherId) || meId <= 0 || otherId <= 0 || meId === otherId) {
      return res.status(400).json({ error: 'Érvénytelen meUserId / otherUserId' });
    }

    if (req.user?.id !== meId) {
      return res.status(403).json({ error: 'Nincs jogosultság' });
    }

    const where = {
      [Op.or]: [
        { senderUserId: meId,   receiverUserId: otherId },
        { senderUserId: otherId, receiverUserId: meId   }
      ]
    };

    const deleted = await Message.destroy({ where });
    return res.json({ deleted });
  } catch (err) {
    console.error('deleteConversation error:', err);
    return res.status(500).json({ error: 'Nem sikerült törölni a beszélgetést.' });
  }
};
