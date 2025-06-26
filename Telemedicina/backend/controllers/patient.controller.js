const { Doctor, User } = require('../models');

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

