const { Patient, Doctor, User, Appointment } = require('../models');

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [
        {
          model: Doctor,
          attributes: ['id', 'speciality', 'introduction', 'registDate']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    const response = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        address: user.address,
        birthDate: user.birthDate,
        pictureUrl: user.pictureUrl
      },
      doctor: user.Doctor
        ? {
          id: user.Doctor.id,
          speciality: user.Doctor.speciality,
          introduction: user.Doctor.introduction,
          registDate: user.Doctor.registDate
        }
        : null
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Hiba a /me route-nál:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { doctor_id, from, to } = req.body;

    if (!doctor_id || !from || !to) {
      return res.status(400).json({ message: 'Hiányzó adatok.' });
    }

    const newAppointment = await Appointment.create({
      doctor_id,
      from,
      to,
      status: 'free',
      patient_id: null
    });

    res.status(201).json({ message: 'Rendelés létrehozva.', appointment: newAppointment });
  } catch (err) {
    console.error('Hiba appointment létrehozásakor:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.getAppointmentsForCurrentDoctor = async (req, res) => {
  try {
    const userId = req.user.id;

    const doctor = await Doctor.findOne({ where: { userId: userId } });

    if (!doctor) {
      return res.status(404).json({ message: 'Orvos nem található a token alapján.' });
    }

    const appointments = await Appointment.findAll({
      where: { doctor_id: doctor.id },
      order: [['from', 'ASC']]
    });

    res.status(200).json(appointments);
  } catch (err) {
    console.error('❌ Hiba az időpontok lekérésekor:', err);
    res.status(500).json({ message: 'Szerverhiba az időpontok lekérésekor.' });
  }
};

exports.getAppointmentUserData = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Orvos nem található.' });
    }

    const appointments = await Appointment.findAll({
      where: { doctor_id: doctor.id },
      include: [
        {
          model: Patient,
          include: [
            {
              model: User,
              attributes: ['name', 'email', 'phoneNumber']
            }
          ]
        }
      ],
      order: [['from', 'ASC']]
    });

    res.status(200).json(appointments);
  } catch (err) {
    console.error('❌ Hiba az időpontok lekérésekor:', err);
    res.status(500).json({ message: 'Szerverhiba az időpontok lekérésekor.' });
  }
};

exports.deleteAppointment = async (req, res) => {
  const appointmentId = req.body.id;

  if (!appointmentId) {
    return res.status(400).json({ message: 'Hiányzó appointment ID.' });
  }

  try {
    const result = await Appointment.destroy({ where: { id: appointmentId } });

    if (result === 0) {
      return res.status(404).json({ message: 'Időpont nem található.' });
    }

    res.status(200).json({ message: 'Időpont sikeresen törölve.' });
  } catch (err) {
    console.error('❌ Törlés hiba:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};
