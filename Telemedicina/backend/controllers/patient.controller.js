const { Doctor, User, Patient} = require('../models');

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate', 'pictureUrl'],
      include: [
        {
          model: Patient,
          attributes: ['height', 'weight', 'homePhone', 'taj', 'homePhone', 'registDate']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    const response = {
      ...user.toJSON(),
      ...user.Patient?.dataValues
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Hiba a /me route-nál:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.updateProfile = async (req, res) => {
  const userId = req.body.id;
  const {
    name,
    address,
    phoneNumber,
    homePhone,
    pictureUrl,
    height,
    weight
  } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Felhasználó nem található' });

    if (name) user.name = name;
    if (address) user.address = address;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (pictureUrl) user.pictureUrl = pictureUrl;

    await user.save();

    if (homePhone) {
      const patient = await Patient.findOne({ where: { userId } });
      if (patient) {
        patient.homePhone = homePhone;
        patient.height = height;
        patient.weight = weight;
        await patient.save();
      }
    }

    res.status(200).json({ message: 'Profil frissítve' });
  } catch (err) {
    console.error('❌ Hiba a mentés során:', err);
    res.status(500).json({ error: 'Szerverhiba történt' });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    console.log('🔍 Lekérdezés indul...');
    const doctors = await Doctor.findAll({
      include: [{
        model: User,
        attributes: ['name', 'email', 'phoneNumber', 'address', 'pictureUrl']
      }]
    });
    res.status(200).json(doctors);
  } catch (err) {
    console.error('❌ Lekérdezési hiba:', err);
    res.status(500).json({ message: 'Hiba történt az orvosok lekérdezésekor.', error: err });
  }
};

