const { Patient, Doctor, User, Appointment, PatientTag, sequelize, Diagnosis} = require('../models');
const {Op} = require("sequelize");

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [
        {
          model: Doctor,
          attributes: ['id', 'speciality', 'introduction', 'avgRating', 'registDate']
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
          avgRating: user.Doctor.avgRating,
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

exports.updateProfile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, ...updateFields } = req.body;
    if (!id) {
      await t.rollback();
      return res.status(400).json({ message: 'Missing user id' });
    }

    const doctor = await Doctor.findOne({ where: { userId: id }, transaction: t });
    if (!doctor) {
      await t.rollback();
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const userAllowed   = ['name', 'address', 'phoneNumber', 'pictureUrl'];
    const doctorAllowed = ['speciality', 'introduction'];

    const userFields = {};
    const doctorFields = {};

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) userFields[k] = updateFields[k];
    }
    for (const k of doctorAllowed) {
      if (updateFields[k] !== undefined) doctorFields[k] = updateFields[k];
    }

    if (Object.keys(userFields).length > 0) {
      await User.update(userFields, { where: { id }, transaction: t });
    }
    if (Object.keys(doctorFields).length > 0) {
      await Doctor.update(doctorFields, { where: { id: doctor.id }, transaction: t });
    }

    const updatedUser = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'address', 'phoneNumber', 'pictureUrl'],
      transaction: t
    });
    const updatedDoctor = await Doctor.findOne({
      where: { userId: id },
      attributes: ['id', 'userId', 'speciality', 'introduction', 'registDate', 'avgRating'],
      transaction: t
    });

    await t.commit();
    return res.json({
      message: 'Doctor profile updated successfully',
      user: updatedUser,
      doctor: updatedDoctor
    });
  } catch (error) {
    await t.rollback();
    console.error('❌ Error updating doctor profile:', error);
    return res.status(500).json({ message: 'Server error', error: String(error) });
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
  const { patientIds } = req.body;

  if (!patientIds || !Array.isArray(patientIds)) {
    return res.status(400).json({ message: 'Hiányzó vagy érvénytelen patientIds tömb.' });
  }

  try {
    const patients = await Patient.findAll({
      where: { id: patientIds },
      include: [
        {
          model: User,
          attributes: ['name', 'email', 'phoneNumber']
        }
      ]
    });

    const userDataMap = {};
    for (const patient of patients) {
      userDataMap[patient.id] = {
        name: patient.User.name,
        email: patient.User.email,
        phoneNumber: patient.User.phoneNumber
      };
    }

    res.status(200).json(userDataMap);
  } catch (err) {
    console.error('❌ Hiba a beteg adatok lekérésekor:', err);
    res.status(500).json({ message: 'Szerverhiba a beteg adatok lekérésekor.' });
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

exports.getMyPatients = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Missing user id' });
    }

    // Orvos azonosítása
    const doctor = await Doctor.findOne({
      where: { userId },
      attributes: ['id']
    });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Páciensek lekérése (csak azok, akiknek volt időpontjuk az orvoshoz)
    const apps = await Appointment.findAll({
      where: {
        doctor_id: doctor.id,
        patient_id: { [Op.ne]: null },
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'homePhone', 'height', 'weight', 'gender', 'taj'],
          include: [
            {
              model: User,
              attributes: [
                'id', 'name', 'email', 'phoneNumber', 'address', 'birthDate', 'pictureUrl'
              ]
            }
          ]
        }
      ]
    });

    // Duplikált páciensek kiszűrése
    const byPatient = new Map();

    for (const a of apps) {
      const p = a.Patient;
      if (!p || !p.User) continue;

      if (!byPatient.has(p.id)) {
        const tags = await PatientTag.findAll({
          where: { patient_id: p.id },
          attributes: [
            ['tag_name', 'name'],
            ['tag_value', 'value']
          ]
        });

        byPatient.set(p.id, {
          user: p.User,
          patient: {
            id: p.id,
            homePhone: p.homePhone,
            height: p.height,
            weight: p.weight,
            gender: p.gender,
            taj: p.taj
          },
          tags: tags.map(t => t.get({ plain: true }))
        });
      }
    }

    return res.json({
      doctorId: doctor.id,
      count: byPatient.size,
      patients: Array.from(byPatient.values())
    });

  } catch (err) {
    console.error('❌ getMyPatients error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserDataForDiagnosis = async (req, res) => {
  try {
    const { patientIds } = req.body;

    if (!Array.isArray(patientIds)) {
      return res.status(400).json({ message: 'Hiányzó vagy érvénytelen patientIds tömb.' });
    }

    const ids = [...new Set(
      patientIds
        .map(n => Number(n))
        .filter(n => Number.isInteger(n))
    )];

    if (ids.length === 0) {
      return res.status(200).json({});
    }

    const patients = await Patient.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: [
        'id',
        'height',
        'weight',
        'homePhone',
        'taj',
        'registDate',
        'gender',
        'userId'
      ],
      include: [{
        model: User,
        attributes: [
          'id',
          'name',
          'email',
          'role',
          'phoneNumber',
          'address',
          'birthDate',
          'pictureUrl'
        ]
      }]
    });

    const out = {};
    for (const p of patients) {
      const u = p.User || null;
      out[p.id] = {
        user: u ? {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phoneNumber: u.phoneNumber,
          address: u.address,
          birthDate: u.birthDate,
          pictureUrl: u.pictureUrl
        } : null,
        patient: {
          id: p.id,
          height: p.height,
          weight: p.weight,
          homePhone: p.homePhone,
          taj: p.taj,
          registDate: p.registDate,
          gender: p.gender
        }
      };
    }

    return res.status(200).json(out);
  } catch (err) {
    console.error('❌ Hiba a beteg/user adatok lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba a beteg/user adatok lekérésekor.' });
  }
};

exports.newDiagnosis = async (req, res) => {
  try {
    const body = req.body;
    const doctor = await Doctor.findOne({ where: { userId: req.user.id }, attributes: ['id'] }); // ha nincs req.user.doctorId
    const record = await Diagnosis.create({
      doctorId: doctor?.id ?? req.user.doctorId ?? null,
      patientId: body.patient?.id,
      appointmentId: body.appointmentId,

      // Symptoms
      chiefComplaint: body.symptoms?.chiefComplaint,
      onsetDate: body.symptoms?.onsetDate,
      history: body.symptoms?.history,

      // Exam
      bpSys: body.exam?.bpSys,
      bpDia: body.exam?.bpDia,
      heartRate: body.exam?.heartRate,
      tempC: body.exam?.tempC,
      spo2: body.exam?.spo2,
      weightKg: body.exam?.weightKg,
      heightCm: body.exam?.heightCm,
      bmi: body.exam?.bmi,
      examSummary: body.exam?.summary,

      // Diagnosis
      primaryText: body.diagnosis?.primaryText,
      codeSystem: body.diagnosis?.codeSystem,
      code: body.diagnosis?.code,
      certaintyPct: body.diagnosis?.certaintyPct,
      severity: body.diagnosis?.severity,
      differentials: body.diagnosis?.differentials,

      // Plan
      assessment: body.plan?.assessment,
      planText: body.plan?.planText,
      redFlags: !!body.plan?.redFlags,
      informed: !!body.plan?.informed
    });

    res.status(201).json(record);
  } catch (err) {
    console.error('❌ Hiba diagnózis mentésekor:', err);
    res.status(500).json({ error: 'Nem sikerült elmenteni a diagnózist' });
  }
};
