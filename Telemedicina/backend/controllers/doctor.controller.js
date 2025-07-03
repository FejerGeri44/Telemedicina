const { Doctor, User } = require('../models');

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate', 'pictureUrl'],
      include: [
        {
          model: Doctor,
          attributes: ['speciality', 'introduction', 'registDate']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    const response = {
      ...user.toJSON(),
      ...user.Doctor?.dataValues
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Hiba a /me route-nál:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};
