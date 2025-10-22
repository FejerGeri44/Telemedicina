const {
  Doctor,
  User,
  Patient,
  Appointment,
  PatientTag,
  DoctorRating,
  sequelize
} = require('../models');
const admin = require('../config/firebase-config');

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [{
        model: Patient,
        attributes: ['id', 'height', 'weight', 'homePhone', 'taj', 'registDate', 'gender']
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

    const patientData = user.Patient ? {
      id: user.Patient.id,
      height: user.Patient.height,
      weight: user.Patient.weight,
      homePhone: user.Patient.homePhone,
      taj: user.Patient.taj,
      registDate: user.Patient.registDate,
      gender: user.Patient.gender
    } : null;

    return res.status(200).json({ user: userData, patient: patientData });
  } catch (err) {
    console.error('Hiba a /me route-nál:', err);
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
    let { id, tags, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const patient = await Patient.findOne({ where: { userId: id }, transaction: t });
    if (!patient) {
      await t.rollback();
      return res.status(404).json({ message: 'Patient not found' });
    }

    const userFields = {};
    const patientFields = {};

    const userAllowed = ['name', 'address', 'phoneNumber'];
    const patientAllowed = ['gender', 'height', 'weight', 'homePhone'];

    const normalizeField = (val) => {
      if (typeof val === 'string') {
        const v = val.trim();
        return v === '' ? undefined : v;
      }
      return val;
    };

    const normalizeNumberField = (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const n = Number(val);
      return Number.isNaN(n) ? undefined : n;
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

    for (const k of patientAllowed) {
      if (updateFields[k] !== undefined) {
        let v = updateFields[k];
        if (['height', 'weight'].includes(k)) {
          v = normalizeNumberField(v);
        } else {
          v = normalizeField(v);
        }
        if (v !== undefined) patientFields[k] = v;
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
    if (Object.keys(patientFields).length > 0) {
      await Patient.update(patientFields, { where: { id: patient.id }, transaction: t });
    }

    let tagsParsed = tags;
    if (typeof tags === 'string') {
      try { tagsParsed = JSON.parse(tags); } catch (_) { tagsParsed = null; }
    }

    if (Array.isArray(tagsParsed)) {
      await PatientTag.destroy({ where: { patient_id: patient.id }, transaction: t });

      const toCreate = tagsParsed
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
    const rows = await Doctor.findAll({
      attributes: ['id','speciality','introduction','avgRating','registDate'],
      include: [{
        model: User,
        as: 'User',
        attributes: ['id','name','email','role','phoneNumber','address','birthDate','pictureUrl']
      }]
    });

    const items = rows.map(r => {
      const j = r.toJSON();

      const doctor = {
        id: j.id,
        speciality: j.speciality,
        introduction: j.introduction ?? null,
        avgRating: j.avgRating ?? null,
        registDate: j.registDate
          ? (j.registDate instanceof Date ? j.registDate.toISOString() : String(j.registDate))
          : null,
      };

      const user = j.User ? {
        id: j.User.id,
        name: j.User.name,
        email: j.User.email,
        role: j.User.role,
        phoneNumber: j.User.phoneNumber,
        address: j.User.address ?? undefined,
        birthDate: j.User.birthDate
          ? (j.User.birthDate instanceof Date ? j.User.birthDate.toISOString() : String(j.User.birthDate))
          : undefined,
        pictureUrl: j.User.pictureUrl,
      } : null;

      return { user, doctor };
    });

    return res.status(200).json(items);
  } catch (err) {
    console.error('❌ Lekérdezési hiba:', err);
    res.status(500).json({
      message: 'Hiba történt az orvosok lekérdezésekor.',
      error: err
    });
  }
};

exports.getDoctorsAppointments = async (req, res) => {
  const { doctorId } = req.body;

  if (!doctorId) {
    return res.status(400).json({ error: 'doctorId nincs megadva a body-ban.' });
  }

  try {
    const doctor = await Doctor.findOne({ where: { userId: doctorId } });
    if (!doctor) {
      return res.status(404).json({ error: 'Nincs ilyen doctor a megadott userId alapján.' });
    }

    const rows = await Appointment.findAll({
      where: { doctor_id: doctor.id },
      attributes: ['id', 'doctor_id', 'patient_id', 'from', 'to', 'status'],
      order: [['from', 'ASC']]
    });

    const appointments = rows.map(r => ({
      id: r.id,
      doctor_id: r.doctor_id,
      patient_id: r.patient_id ?? null,
      from: new Date(r.from).toISOString(),
      to: new Date(r.to).toISOString(),
      status: r.status
    }));

    return res.status(200).json({ appointments });
  } catch (err) {
    console.error('❌ Lekérdezési hiba:', err);
    return res.status(500).json({ error: 'Szerverhiba.' });
  }
};

exports.registerToAppointment = async (req, res) => {
  const { doctorId, patientId, from, to } = req.body;

  if (!doctorId || !patientId || !from || !to) {
    return res.status(400).json({ error: 'Hiányzó mezők a kérésben.' });
  }

  try {
    const doctor = await Doctor.findOne({ where: { userId: doctorId } });
    if (!doctor) {
      return res.status(404).json({ error: 'Nincs ilyen orvos a megadott userId alapján.' });
    }

    const affected = await Appointment.update(
      {
        patient_id: patientId,
        status: 'accepted'
      },
      {
        where: {
          doctor_id: doctor.id,
          from: new Date(from),
          to: new Date(to),
          status: 'free'
        },
        limit: 1
      }
    );

    if (affected === 0) {
      return res.status(404).json({ error: 'Nem található szabad időpont (lehet, hogy időközben lefoglalták).' });
    }

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
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({ message: 'Páciens nem található.' });
    }

    const rows = await Appointment.findAll({
      where: { patient_id: patient.id },
      order: [['from', 'ASC']],
      attributes: ['id', 'from', 'to', 'status'],
      include: [{
        model: Doctor,
        attributes: ['id', 'speciality', 'introduction', 'avgRating', 'registDate', 'userId'],
        include: [{
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate', 'pictureUrl']
        }]
      }]
    });

    const result = rows.map(appt => ({
      id: appt.id,
      from: new Date(appt.from).toISOString(),
      to: new Date(appt.to).toISOString(),
      status: appt.status,
      doctor: {
        user: {
          id: appt.Doctor?.User?.id,
          name: appt.Doctor?.User?.name,
          email: appt.Doctor?.User?.email,
          role: appt.Doctor?.User?.role,
          phoneNumber: appt.Doctor?.User?.phoneNumber,
          address: appt.Doctor?.User?.address,
          birthDate: appt.Doctor?.User?.birthDate,
          pictureUrl: appt.Doctor?.User?.pictureUrl
        },
        doctor: {
          id: appt.Doctor?.id,
          speciality: appt.Doctor?.speciality,
          introduction: appt.Doctor?.introduction ?? null,
          avgRating: appt.Doctor?.avgRating ?? null,
          registDate: appt.Doctor?.registDate ?? null
        }
      }
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba az időpontok lekérésekor:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.cancelAppointment = async (req, res) => {
  const id = req.body.id ?? req.params?.id;
  if (!id) return res.status(400).json({ error: 'Hiányzik az appointment ID.' });

  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Páciens nem található.' });

    const affected = await Appointment.update(
      { patient_id: null, status: 'free' },
      {
        where: { id, patient_id: patient.id, status: 'accepted' },
        limit: 1
      }
    );

    if (affected === 0) {
      return res.status(404).json({ error: 'Nem található lemondható (accepted) időpont.' });
    }

    return res.status(200).json({ message: 'Időpont lemondva.' });
  } catch (err) {
    console.error('❌ Lemondási hiba:', err);
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
