const { Doctor, User, Patient, Appointment, PatientTag, sequelize, DoctorRating} = require('../models');

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [
        {
          model: Patient,
          attributes: ['id', 'height', 'weight', 'homePhone', 'taj', 'registDate', 'gender']
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
          registDate: user.Patient.registDate,
          gender: user.Patient.gender
        }
        : null
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Hiba a route-nál:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.getPatientMeTags = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Hiányzó felhasználó azonosító.' });

    // Patient azonosítása a userId alapján
    const patient = await Patient.findOne({
      where: { userId: userId },
      attributes: ['id']
    });
    if (!patient) {
      return res.status(404).json({ message: 'Páciens nem található.' });
    }

    // Tagek lekérése
    const rows = await PatientTag.findAll({
      where: { patient_id: patient.id },
      attributes: [
        ['tag_name', 'name'],
        ['tag_value', 'value']
      ],
      order: [
        [
          sequelize.literal(`
        CASE tag_name
          WHEN 'bloodType' THEN 1
          WHEN 'allergy' THEN 2
          WHEN 'chronic' THEN 3
          WHEN 'medication' THEN 4
          WHEN 'diet' THEN 5
          ELSE 6
        END
      `),
          'ASC'
        ]
      ]
    });

    return res.json({
      userId,
      patientId: patient.id,
      tags: rows.map(r => r.get({ plain: true }))
    });
  } catch (err) {
    console.error('❌ Hiba a tagek lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.updateProfile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, tags, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const patient = await Patient.findOne({ where: { userId: id }, transaction: t });
    if (!patient) {
      await t.rollback();
      return res.status(404).json({ message: 'Patient not found' });
    }

    const userFields = {};
    const patientFields = {};

    const userAllowed = ['name', 'address', 'birthDate', 'phoneNumber', 'pictureUrl'];
    const patientAllowed = ['gender', 'height', 'weight', 'homePhone'];

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) userFields[k] = updateFields[k];
    }
    for (const k of patientAllowed) {
      if (updateFields[k] !== undefined) patientFields[k] = updateFields[k];
    }

    if (Object.keys(userFields).length > 0) {
      await User.update(userFields, { where: { id }, transaction: t });
    }
    if (Object.keys(patientFields).length > 0) {
      await Patient.update(patientFields, { where: { id: patient.id }, transaction: t });
    }

    if (Array.isArray(tags)) {
      if (!PatientTag) {
        throw new Error('PatientTag model is undefined (model import/init hiba).');
      }

      await PatientTag.destroy({ where: { patient_id: patient.id }, transaction: t });

      const toCreate = tags
        .filter(tg => tg && tg.name && tg.value)
        .map(tg => ({
          patient_id: patient.id,
          tag_name: String(tg.name).trim(),
          tag_value: String(tg.value).trim()
        }));

      if (toCreate.length > 0) {
        await PatientTag.bulkCreate(toCreate, { transaction: t });
      }
    }

    await t.commit();
    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    await t.rollback();
    console.error('❌ Error updating profile:', error);
    return res.status(500).json({ message: 'Server error', error: String(error) });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    console.log('🔍 Lekérdezés indul...');
    const doctors = await Doctor.findAll({
      attributes: [
        'id',
        'userId',
        'speciality',
        'introduction',
        'avgRating',
        'registDate'
      ],
      include: [{
        model: User,
        attributes: ['id','name','email','phoneNumber','address','pictureUrl']
      }]
    });
    res.status(200).json(doctors);
  } catch (err) {
    console.error('❌ Lekérdezési hiba:', err);
    res.status(500).json({
      message: 'Hiba történt az orvosok lekérdezésekor.',
      error: err
    });
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

    const Appointments = appointments.map(appt => {
      const From = new Date(appt.from);
      const To = new Date(appt.to);

      return {
        ...appt.toJSON(),
        from: From,
        to: To
      };
    });

    return res.status(200).json(Appointments);
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

    const appointments = await Appointment.findAll({
      where: { patient_id: patient.id }
    });

    return res.status(200).json(appointments);
  } catch (err) {
    console.error('❌ Hiba az időpontok lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.getDoctorCardData = async (req, res) => {
  const { doctorId } = req.body;

  if (!doctorId) {
    return res.status(400).json({ error: 'Hiányzó doctorId.' });
  }

  try {
    const doctor = await Doctor.findOne({
      where: { id: doctorId },
      attributes: ['speciality'],
      include: [{
        model: User,
        attributes: ['name', 'pictureUrl']
      }]
    });

    if (!doctor || !doctor.User) {
      return res.status(404).json({ error: 'Orvos nem található.' });
    }

    return res.status(200).json({ pictureUrl: doctor.User.pictureUrl, name: doctor.User.name, speciality: doctor.speciality });
  } catch (err) {
    console.error('❌ Hiba a doctor kép lekérdezésénél:', err);
    return res.status(500).json({ error: 'Szerverhiba.' });
  }
};

exports.loadMyRegisteredAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({ message: 'Páciens nem található.' });
    }

    const appointments = await Appointment.findAll({
      where: { patient_id: patient.id },
      attributes: ['id', 'patient_id', 'doctor_id', 'from', 'to', 'status'],
      include: [
        {
          model: Doctor,
          attributes: ['speciality'],
          include: [
            {
              model: User,
              attributes: ['name', 'phoneNumber', 'address', 'email', 'pictureUrl']
            }
          ]
        }
      ]
    });

    const formatted = appointments.map((appt) => ({
      id: appt.id,
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      from: appt.from,
      to: appt.to,
      status: appt.status,
      speciality: appt.Doctor?.speciality || null,
      doctor: appt.Doctor?.User
        ? {
          name: appt.Doctor.User.name,
          phoneNumber: appt.Doctor.User.phoneNumber,
          address: appt.Doctor.User.address,
          email: appt.Doctor.User.email,
          pictureUrl: appt.Doctor.User.pictureUrl
        }
        : null
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error('❌ Hiba az időpontok lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.deleteAppointment = async (req, res) => {
  const appointmentId = req.body.id;
  if (!appointmentId) {
    return res.status(400).json({ error: 'Hiányzik az appointment ID.' });
  }

  try {
    const appt = await Appointment.findByPk(appointmentId);
    if (!appt) return res.status(404).json({ error: 'Időpont nem található.' });

    await appt.destroy();
    return res.status(200).json({ message: 'Időpont törölve.' });
  } catch (err) {
    console.error('❌ Hiba törlés közben:', err);
    return res.status(500).json({ error: 'Szerverhiba.' });
  }
};

exports.rateDoctor = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { doctorId, value } = req.body;

    const doctor_id = parseInt(doctorId, 10);
    const val = Number(value);
    if (!Number.isInteger(doctor_id) || !Number.isInteger(val) || val < 1 || val > 5) {
      await t.rollback();
      return res.status(400).json({ message: 'Érvénytelen kérés: doctorId egész szám, value 1..5 egész.' });
    }

    const userId = req.user?.id;

    const patient = await Patient.findOne({ where: { userId }, transaction: t });
    if (!patient) {
      await t.rollback();
      return res.status(403).json({ message: 'Csak páciens értékelhet.' });
    }

    const doctor = await Doctor.findByPk(doctor_id, { transaction: t });
    if (!doctor) {
      await t.rollback();
      return res.status(404).json({ message: 'Orvos nem található.' });
    }

    await DoctorRating.upsert({
      doctor_id,
      patient_id: patient.id,
      value: val
    }, { transaction: t });

    const row = await DoctorRating.findOne({
      where: { doctor_id },
      attributes: [
        [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('value')), 2), 'avg']
      ],
      raw: true,
      transaction: t
    });
    const avg = row?.avg != null ? Number(row.avg) : null;

    await Doctor.update({ avgRating: avg }, { where: { id: doctor_id }, transaction: t });

    await t.commit();
    return res.json({ ok: true, avg });
  } catch (err) {
    await t.rollback();
    console.error('❌ Értékelés mentési hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba az értékelés mentésekor.' });
  }
};
