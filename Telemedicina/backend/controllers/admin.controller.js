const { User, Admin, Patient, Doctor, PatientTag, sequelize, SystemMessage} = require('../models');
const bcrypt = require("bcrypt");

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'pictureUrl', 'name', 'email', 'role', 'phoneNumber', 'address', 'birthDate'],
      include: [{
        model: Admin,
        attributes: ['id', 'registDate']
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

    const adminData = user.Admin ? {
      id: user.Admin.id,
      registDate: user.Admin.registDate
    } : null;

    return res.status(200).json({ user: userData, admin: adminData });
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

    const admin = await Admin.findOne({ where: { userId: id }, transaction: t });
    if (!admin) {
      await t.rollback();
      return res.status(404).json({ message: 'Admin not found' });
    }

    const userAllowed   = ['name', 'address', 'phoneNumber', 'pictureUrl'];
    const userFields = {};
    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) userFields[k] = updateFields[k];
    }

    if (Object.keys(userFields).length > 0) {
      await User.update(userFields, { where: { id }, transaction: t });
    }

    const updatedUser = await User.findByPk(id, {
      attributes: ['id', 'name', 'address', 'phoneNumber', 'pictureUrl'],
      transaction: t
    });

    await t.commit();
    return res.json({
      message: 'Admin profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    await t.rollback();
    console.error('❌ Error updating doctor profile:', error);
    return res.status(500).json({ message: 'Server error', error: String(error) });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    console.log('🔍 Páciensek lekérdezése indul...');
    const rows = await Patient.findAll({
      attributes: ['id','userId','height','weight','taj','homePhone','registDate','gender'],
      include: [
        {
          model: User,
          attributes: ['id','name','email','role','phoneNumber','address','birthDate','pictureUrl']
        },
        {
          model: PatientTag,
          as: 'tags',
          attributes: ['tag_name', 'tag_value'],
          required: false
        }
      ],
      order: [[{ model: User }, 'name', 'ASC']]
    });

    const result = rows.map(patient => ({
      user: {
        id: patient.User.id,
        name: patient.User.name,
        email: patient.User.email,
        role: patient.User.role,
        phoneNumber: patient.User.phoneNumber,
        address: patient.User?.address ?? undefined,
        birthDate: patient.User?.birthDate ?? undefined,
        pictureUrl: patient.User?.pictureUrl
      },
      patient: {
        id: patient.id,
        userId: patient.userId,
        height: patient.height,
        weight: patient.weight,
        taj: patient.taj,
        homePhone: patient.homePhone,
        registDate: patient.registDate,
        gender: patient.gender
      },
      tags: (patient.tags ?? []).map(t => ({
        name: t.tag_name,
        value: t.tag_value
      }))
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Páciensek lekérdezési hiba:', err);
    res.status(500).json({
      message: 'Hiba történt a páciensek lekérdezésekor.',
      error: err
    });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    console.log('🔍 Orvosok lekérdezése indul...');
    const rows = await Doctor.findAll({
      attributes: ['id', 'userId', 'speciality', 'introduction', 'registDate', 'avgRating'],
      include: [{
        model: User,
        attributes: ['id','name','email','role', 'phoneNumber','address','birthDate','pictureUrl']
      }],
    });

    const result = rows.map(doctor => ({
      user: {
        id: doctor.User.id,
        name: doctor.User.name,
        email: doctor.User.email,
        role: doctor.User.role,
        phoneNumber: doctor.User.phoneNumber,
        address: doctor.User?.address ?? undefined,
        birthDate: doctor.User?.birthDate ?? undefined,
        pictureUrl: doctor.User?.pictureUrl
      },
      doctor: {
        id: doctor.id,
        userId: doctor.userId,
        speciality: doctor.speciality,
        introduction: doctor.introduction,
        registDate: doctor.registDate,
        avgRating: doctor.avgRating
      }
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba a /doctors lekérésnél:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    console.log('🔍 Adminisztrátorok lekérdezése indul...');
    const rows = await Admin.findAll({
      attributes: ['id', 'userId', 'registDate'],
      include: [{
        model: User,
        attributes: ['id','name','email','role', 'phoneNumber','address','birthDate','pictureUrl']
      }],
    });

    const result = rows.map(admin => ({
      user: {
        id: admin.User.id,
        name: admin.User.name,
        email: admin.User.email,
        role: admin.User.role,
        phoneNumber: admin.User.phoneNumber,
        address: admin.User?.address ?? undefined,
        birthDate: admin.User?.birthDate ?? undefined,
        pictureUrl: admin.User?.pictureUrl
      },
      admin: {
        id: admin.id,
        userId: admin.userId,
        registDate: admin.registDate
      }
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba a /admins lekérésnél:', err);
    res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.registerPatient = async (req, res) => {
  const body = req.body;

  try {
    const { name, email, password, phoneNumber, taj, address, birthDate, height, weight, homePhone, gender } = req.body;
    const pictureUrl = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-profilePictures%2Fpatient.png?alt=media&token=cd37f41f-37cf-4a6e-a8f5-091327113834';

    const adminUser = await User.findByPk(body.adminUserId);
    if (!adminUser) {
      return res.status(403).json({ message: 'A megadott adminUserId-hoz nem található felhasználó.' });
    }

    const adminRow = await Admin.findByPk(body.adminId); // ha a PK nem id, igazítsd
    if (!adminRow) {
      return res.status(403).json({ message: 'A megadott adminId nem létezik.' });
    }
    // ha az Admin táblában a FK neve 'userId' helyett 'user_id', írd át!
    if (Number(adminRow.userId) !== Number(body.adminUserId)) {
      return res.status(403).json({ message: 'A megadott adminId nem ehhez a felhasználóhoz tartozik.' });
    }

    // Ellenőrizzük, hogy van-e már ilyen e-mail
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    // Jelszó hash-elése
    const hashedPassword = await bcrypt.hash(password, 10);

    // Felhasználó mentése
    const user = await User.create({
      email,
      name,
      password: hashedPassword,
      role: 'patient',
      phoneNumber,
      address,
      birthDate,
      pictureUrl
    });

    // Páciens bejegyzés létrehozása
    await Patient.create({
      userId: user.id,
      height,
      weight,
      taj,
      homePhone,
      gender: gender,

      registDate: new Date()
    });

    return res.status(201).json({ message: 'Páciens regisztráció sikeres.' });

  } catch (error) {
    console.error('Hiba a páciens regisztráció során:', error);
    return res.status(500).json({ message: 'Szerverhiba a regisztráció közben.' });
  }
};

exports.registerDoctor = async (req, res) => {
  try {
    const body = req.body;
    const { name, email, password, phoneNumber, address, birthDate, speciality, introduction } = req.body;
    const pictureUrl = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-profilePictures%2Fdoctor.png?alt=media&token=7a578ae2-23b6-4316-b9d8-568a0ee9e310';

    const adminUser = await User.findByPk(body.adminUserId);
    if (!adminUser) {
      return res.status(403).json({ message: 'A megadott adminUserId-hoz nem található felhasználó.' });
    }

    const adminRow = await Admin.findByPk(body.adminId); // ha a PK nem id, igazítsd
    if (!adminRow) {
      return res.status(403).json({ message: 'A megadott adminId nem létezik.' });
    }
    // ha az Admin táblában a FK neve 'userId' helyett 'user_id', írd át!
    if (Number(adminRow.userId) !== Number(body.adminUserId)) {
      return res.status(403).json({ message: 'A megadott adminId nem ehhez a felhasználóhoz tartozik.' });
    }
    // Duplikált e-mail ellenőrzés
    const alreadyExists = await User.findOne({ where: { email: body.email } });
    if (alreadyExists) {
      return res.status(409).json({ error: 'Ezzel az e-mail címmel már van regisztráció.' });
    }

    // Jelszó hash-elése
    const hashedPassword = await bcrypt.hash(password, 10);

    // Felhasználó mentése
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'doctor',
      phoneNumber,
      address,
      birthDate,
      pictureUrl
    });

    // Orvos-specifikus adatok mentése
    await Doctor.create({
      userId: user.id,
      speciality,
      introduction,
      registDate: new Date()
    });

    return res.status(201).json({ message: 'Orvos regisztráció sikeres.' });

  } catch (err) {
    console.error('❌ Orvos regisztrációs hiba:', err);
    res.status(500).json({ error: 'Belső szerverhiba az orvos regisztráció során.' });
  }
};

exports.registerAdmin = async (req, res) => {
  const actingAdminUserId = req.user?.id;
  const { name, email, password, phoneNumber, address, birthDate } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Név, e-mail és jelszó kötelező.' });
    }

    const adminUser = await User.findByPk(actingAdminUserId);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Csak admin hozhat létre új admint.' });
    }

    const adminRow = await Admin.findOne({ where: { userId: actingAdminUserId } });
    if (!adminRow) {
      return res.status(403).json({ message: 'A bejelentkezett felhasználó nem admin rekord.' });
    }

    const alreadyExists = await User.findOne({ where: { email } });
    if (alreadyExists) {
      return res.status(409).json({ error: 'Ezzel az e-mail címmel már van regisztráció.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const pictureUrl = 'https://firebasestorage.googleapis.com/v0/b/szakdolgozat-8655.firebasestorage.app/o/default-profilePictures%2Fadmin.png?alt=media&token=da525901-0c93-45aa-a7c5-5dcd67d1e6a9';

      const newUser = await User.create({
        name, email, password: hashedPassword, role: 'admin',
        phoneNumber: phoneNumber || null,
        address: address || null,
        birthDate: birthDate || null,
        pictureUrl
      });

      await Admin.create({
        userId: newUser.id,
        registDate: new Date()
      });

      return res.status(201).json({ message: 'Admin regisztráció sikeres.', userId: newUser.id });
    } catch (e) {

      console.error('❌ Admin regisztrációs hiba (TX):', e);
      return res.status(500).json({ error: 'Belső szerverhiba az admin regisztráció során.' });
    }
  } catch (err) {
    console.error('❌ Admin regisztrációs hiba:', err);
    return res.status(500).json({ error: 'Belső szerverhiba az admin regisztráció során.' });
  }
};

exports.deleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Nincs kiválasztott felhasználó.' });
    }

    const usersToDelete = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'role']
    });

    if (usersToDelete.length === 0) {
      return res.status(404).json({
        message: 'Nem található egyetlen felhasználó sem a megadott ID-k alapján.'
      });
    }

    const roles = [...new Set(usersToDelete.map(u => (u.role || '').toLowerCase()))]
      .filter(Boolean)
      .slice(0, 3);

    const deleted = await User.destroy({
      where: { id: userIds }
    });

    if (deleted === 0) {
      return res.status(404).json({
        message: 'Nem sikerült törölni a felhasználókat (lehet, hogy időközben már nem léteznek).'
      });
    }

    return res.status(200).json({
      message: 'Felhasználó(k) sikeresen törölve.',
      deletedCount: deleted,
      roles: roles
    });
  } catch (err) {
    console.error('Hiba a felhasználók törlése közben:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.getPendingDoctors = async (req, res) => {
  try {
    const rows = await Doctor.findAll({
      where: { status: 'pending' },
      attributes: ['id','userId','speciality','introduction','registDate','avgRating','status'],
      include: [{
        model: User,
        attributes: ['id','name','email','role','phoneNumber','address','birthDate','pictureUrl']
      }],
    });

    const result = rows.map(doctor => ({
      user: {
        id: doctor.User?.id,
        name: doctor.User?.name,
        email: doctor.User?.email,
        role: doctor.User?.role,
        phoneNumber: doctor.User?.phoneNumber,
        address: doctor.User?.address ?? undefined,
        birthDate: doctor.User?.birthDate ?? undefined,
        pictureUrl: doctor.User?.pictureUrl
      },
      doctor: {
        id: doctor.id,
        speciality: doctor.speciality,
        introduction: doctor.introduction ?? null,
        avgRating: doctor.avgRating ?? null,
        registDate: doctor.registDate ?? null,
        status: doctor.status
      }
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Pending orvosok lekérési hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.approveDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ message: 'Hiányzik a doctorId.' });
    }

    const [count] = await Doctor.update(
      { status: 'approved' },
      { where: { id: doctorId } }
    );

    if (count === 0) {
      return res.status(404).json({ message: 'Doctor nem található.' });
    }

    return res.json({ message: 'Orvos jóváhagyva.', doctorId });
  } catch (e) {
    console.error('Approve doctor hiba:', e);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.createSystemMessage = async (req, res) => {
  try {
    const { adminId, title, message, type = 'info', audience = 'all', validUntil } = req.body;

    if (!adminId || !title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'adminId, title és message kötelező.' });
    }

    const admin = await Admin.findByPk(adminId, { attributes: ['id'] });
    if (!admin) {
      return res.status(404).json({ message: 'A megadott admin nem található.' });
    }

    let validUntilDate = null;
    if (validUntil) {
      const s = String(validUntil);
      const ymd = s.includes('T') ? s.split('T')[0] : s;
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) validUntilDate = ymd;
    }

    const created = await SystemMessage.create({
      adminId,
      title: title.trim(),
      message: message.trim(),
      type,
      audience,
      validUntil: validUntilDate
    });

    return res.status(201).json({ message: 'Rendszerüzenet mentve.', data: created });
  } catch (err) {
    console.error('Rendszerüzenet mentési hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.listSystemMessages = async (_req, res) => {
  try {
    const rows = await SystemMessage.findAll({
      order: [['createdAt', 'DESC']]
    });
    return res.json(rows);
  } catch (err) {
    console.error('Rendszerüzenetek listázási hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.deleteSystemMessage = async (req, res) => {
  try {
    const { messageId } = req.body || {};
    const id = Number(messageId);

    if (!id || Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'Érvénytelen vagy hiányzó messageId.' });
    }

    const row = await SystemMessage.findByPk(id);
    if (!row) {
      return res.status(404).json({ message: 'Rendszerüzenet nem található.', id });
    }

    await row.destroy();
    return res.status(200).json({ message: 'Rendszerüzenet törölve.', id });
  } catch (err) {
    console.error('❌ Rendszerüzenet törlési hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};
