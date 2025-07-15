const { Doctor, User, Patient, Appointment} = require('../models');

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [
        {
          model: Patient,
          attributes: ['id', 'height', 'weight', 'homePhone', 'taj', 'registDate']
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
      patient: user.Patient
        ? {
          id: user.Patient.id,
          height: user.Patient.height,
          weight: user.Patient.weight,
          homePhone: user.Patient.homePhone,
          taj: user.Patient.taj,
          registDate: user.Patient.registDate
        }
        : null
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Hiba a route-nál:', err);
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

exports.getDoctorsAppointments = async  (req, res) => {
  const { doctorId } = req.body;

  if (!doctorId) {
    return res.status(400).json({ error: 'doctorId nincs megadva a body-ban.' });
  }

  try {
    const appointments = await Appointment.findAll({
      where: { doctor_id: doctorId }
    });

    const adjustedAppointments = appointments.map(appt => {
      const adjustedFrom = new Date(appt.from);
      adjustedFrom.setHours(adjustedFrom.getHours() + 2);

      const adjustedTo = new Date(appt.to);
      adjustedTo.setHours(adjustedTo.getHours() + 2);

      return {
        ...appt.toJSON(),
        from: adjustedFrom,
        to: adjustedTo
      };
    });

    return res.status(200).json(adjustedAppointments);
  } catch (err) {
    console.error('❌ Lekérdezési hiba:', err);
    return res.status(500).json({ error: 'Szerverhiba.' });
  }
};

exports.registerToAppointment = async  (req, res) => {
  const { doctorId, patientId, from, to } = req.body;

  if (!doctorId || !patientId || !from || !to) {
    return res.status(400).json({ error: 'Hiányzó mezők a kérésben.' });
  }

  try {
    const appointment = await Appointment.findOne({
      where: {
        doctor_id: doctorId,
        from: new Date(from),
        to: new Date(to),
        status: 'free'
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Nem található szabad időpont.' });
    }

    appointment.patient_id = patientId;
    appointment.status = 'accepted';

    await appointment.save();

    return res.status(200).json({ message: 'Foglalás sikeres.' });
  } catch (err) {
    console.error('❌ Foglalási hiba:', err);
    return res.status(500).json({ error: 'Szerverhiba foglalás közben.' });
  }
};

exports.loadMyAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({ message: 'Páciens nem található.' });
    }

    const count = await Appointment.count({
      where: { patient_id: patient.id }
    });

    return res.status(200).json({ count });
  } catch (err) {
    console.error('❌ Hiba az időpontok számának lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};
