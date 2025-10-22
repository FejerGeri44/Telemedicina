const { Patient, Doctor, User, Appointment, PatientTag, sequelize, Diagnosis} = require('../models');
const {Op} = require("sequelize");
const admin = require("../config/firebase-config");

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [{
        model: Doctor,
        attributes: ['id', 'speciality', 'introduction', 'avgRating', 'registDate']
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      birthDate: user.birthDate,
      pictureUrl: user.pictureUrl
    };

    const doctorData = user.Doctor ? {
      id: user.Doctor.id,
      speciality: user.Doctor.speciality,
      introduction: user.Doctor.introduction,
      avgRating: user.Doctor.avgRating,
      registDate: user.Doctor.registDate
    } : null;

    return res.status(200).json({ user: userData, doctor: doctorData });
  } catch (err) {
    console.error('Hiba a /me route-nál:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.updateProfile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let { id, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const doctor = await Doctor.findOne({ where: { userId: id }, transaction: t });
    if (!doctor) {
      await t.rollback();
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const userFields = {};
    const doctorFields = {};

    const userAllowed = ['name', 'address', 'phoneNumber'];
    const doctorAllowed = ['speciality', 'introduction'];

    const normalizeField = (val) => {
      if (typeof val === 'string') {
        const v = val.trim();
        return v === '' ? undefined : v;
      }
      return val;
    };

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) {
        let v = updateFields[k];
        if (typeof v === 'string') {
          v = v.trim();
          if (v === '') v = undefined;
        } else {
          v = normalizeField(v);
        }
        if (v !== undefined) userFields[k] = v;
      }
    }

    if (req.file && req.file.buffer) {
      const bucket = admin.storage().bucket();
      const objectPath = `user-profilePictures/${id}`;
      const file = bucket.file(objectPath);

      await file.save(req.file.buffer, {
        resumable: false,
        contentType: req.file.mimetype,
        metadata: { cacheControl: 'public, max-age=31536000' }
      });

      await file.makePublic();

      const cacheBuster = Date.now();
      userFields.pictureUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}?v=${cacheBuster}`;
    }
    if (Object.keys(userFields).length > 0) {
      await User.update(userFields, { where: { id }, transaction: t });
    }
    if (Object.keys(doctorFields).length > 0) {
      await Patient.update(doctorFields, { where: { id: doctor.id }, transaction: t });
    }

    await t.commit();
    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    await t.rollback();
    console.error('❌ Error updating profile:', error);
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
                'id', 'name', 'email', 'phoneNumber', 'role', 'address', 'birthDate', 'pictureUrl'
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

    return res.json( Array.from(byPatient.values()) );

  } catch (err) {
    console.error('❌ getMyPatients error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const rows = await Patient.findAll({
      attributes: ['id','userId','height','weight','taj','homePhone','registDate','gender'],
      include: [{
        model: User,
        attributes: ['id','name','email','role','phoneNumber','address','birthDate','pictureUrl']
      }],
      raw: true,
      nest: true
    });

    const data = rows.map(({ User, ...patient }) => ({ user: User, patient }));
    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Páciensek lekérdezési hiba:', err);
    return res.status(500).json({ message: 'Hiba történt a páciensek lekérdezésekor.', error: err });
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

    const response = {};
    for (const p of patients) {
      const u = p.User || null;
      response[p.id] = {
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

    return res.status(200).json(response);
  } catch (err) {
    console.error('❌ Hiba a beteg/user adatok lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba a beteg/user adatok lekérésekor.' });
  }
};

exports.newDiagnosis = async (req, res) => {
  try {
    const patientId = req.body?.patient;
    const chiefComplaint = req.body?.symptoms?.chiefComplaint?.trim();
    const primaryText    = req.body?.diagnosis?.primaryText?.trim();
    const appointmentId  = req.body?.appointmentId;

    if (!patientId || !appointmentId || !chiefComplaint || !primaryText) {
      return res.status(400).json({
        error: 'Hiányzó kötelező mezők (patientId, appointmentId, chiefComplaint, primaryText).'
      });
    }

    const doctor = await Doctor.findOne({
      where: { userId: req.user.id },
      attributes: ['id']
    });

    const appt = await Appointment.findByPk(appointmentId, { attributes: ['id', 'doctor_id', 'patient_id'] });
    if (!appt || (doctor && appt.doctor_id !== doctor.id)) {
      return res.status(403).json({ error: 'Az időpont nem ehhez az orvoshoz tartozik.' });
    }

    // 5) Mentés
    const record = await Diagnosis.create({
      doctorId: doctor?.id ?? req.user.doctorId ?? null,
      patientId,
      appointmentId,

      // Symptoms
      chiefComplaint,
      onsetDate: req.body?.symptoms?.onsetDate ?? null,
      history: req.body?.symptoms?.history ?? null,

      // Exam
      bpSys: req.body?.exam?.bpSys ?? null,
      bpDia: req.body?.exam?.bpDia ?? null,
      heartRate: req.body?.exam?.heartRate ?? null,
      tempC: req.body?.exam?.tempC ?? null,
      spo2: req.body?.exam?.spo2 ?? null,
      weightKg: req.body?.exam?.weightKg ?? null,
      heightCm: req.body?.exam?.heightCm ?? null,
      bmi: req.body?.exam?.bmi ?? null,
      examSummary: req.body?.exam?.summary ?? null,

      // Diagnosis
      primaryText,
      codeSystem: req.body?.diagnosis?.codeSystem ?? null,
      code: req.body?.diagnosis?.code ?? null,
      certaintyPct: req.body?.diagnosis?.certaintyPct ?? null,
      severity: req.body?.diagnosis?.severity ?? null,
      differentials: req.body?.diagnosis?.differentials ?? null,

      // Plan
      assessment: req.body?.plan?.assessment ?? null,
      planText: req.body?.plan?.planText ?? null,
      redFlags: req.body?.plan?.redFlags,
      informed: req.body?.plan?.informed
    });

    await Appointment.update(
      { status: 'done' },
      { where: { id: appointmentId }}
    );

    return res.status(201).json(record);
  } catch (err) {
    console.error('❌ Hiba diagnózis mentésekor:', err);
    return res.status(500).json({ error: 'Nem sikerült elmenteni a diagnózist' });
  }
}
