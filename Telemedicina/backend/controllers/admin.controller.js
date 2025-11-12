const {buildProfile} = require("../utils/profileBuilder");
const {supabaseAdmin} = require("../utils/supabaseAdmin");
const {findByEmail} = require("../repositories/user.repository");
const {createUserWithProfile} = require("../utils/userProfile");
const UserRepository = require("../repositories/user.repository");
const UserProfileService = require("../utils/userProfile");
const SystemMessageRepository = require("../repositories/systemMessage.repository");
const sql = require("../config/db.config");

const PATIENT_DEFAULT_PICTURE = 'https://ubesundbzjtyxxuwmbgg.supabase.co/storage/v1/object/sign/default-profilePictures/patient.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NTY3MmI1OS1mMmE2LTQyNGItYWU2OC1hOWZlMzEyMTM3YzUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkZWZhdWx0LXByb2ZpbGVQaWN0dXJlcy9wYXRpZW50LnBuZyIsImlhdCI6MTc2MTUwOTE1MSwiZXhwIjoxNzkzMDQ1MTUxfQ.xvmkaDIwoHsPgmR6XZRahidlKg7znEf3B25Rfq5jg_Q';
const DOCTOR_DEFAULT_PICTURE  = 'https://ubesundbzjtyxxuwmbgg.supabase.co/storage/v1/object/sign/default-profilePictures/doctor.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NTY3MmI1OS1mMmE2LTQyNGItYWU2OC1hOWZlMzEyMTM3YzUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkZWZhdWx0LXByb2ZpbGVQaWN0dXJlcy9kb2N0b3IucG5nIiwiaWF0IjoxNzYxNTA5MTM4LCJleHAiOjE3OTMwNDUxMzh9.PNLCo1K7ilfieKqES8DXbjz8mC2-kEyiWtxRGpDskOk';
const ADMIN_DEFAULT_PICTURE = 'https://ubesundbzjtyxxuwmbgg.supabase.co/storage/v1/object/sign/default-profilePictures/admin.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NTY3MmI1OS1mMmE2LTQyNGItYWU2OC1hOWZlMzEyMTM3YzUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkZWZhdWx0LXByb2ZpbGVQaWN0dXJlcy9hZG1pbi5wbmciLCJpYXQiOjE3NjIzNjYyMTEsImV4cCI6MTc5MzkwMjIxMX0.OfTyBnnJp4e3aP1WrkumnvPWtC4dFd6NEucU5Gsiu_E';

const ALLOWED_STATUSES = new Set(['Pending', 'Denied']);
const ALLOWED_TYPES = new Set(['info', 'warning', 'error', 'success']);
const ALLOWED_AUDIENCE = new Set(['all', 'patient', 'doctor', 'admin']);

function toE164HU(input) {
  if (!input) return null;
  let s = String(input).trim().replace(/[()\s\-.]/g, '');
  if (s === '') return null;
  if (s.startsWith('06')) s = '+36' + s.slice(2);
  else if (s.startsWith('0036')) s = '+' + s.slice(2);
  else if (/^36\d+/.test(s)) s = '+' + s;
  else if (/^0\d+/.test(s)) s = '+36' + s.slice(1);
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

function toYMD(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function isYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayUtcYmd() {
  return new Date().toISOString().slice(0, 10);
}

exports.updateProfile = async (req, res) => {
  try {
    const { id, ...updateFields } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing user id' });
    const userId = String(id);

    let signedUrlToSave = null;
    let storagePath = null;

    if (req.file?.buffer) {
      const ext = '.jpg';
      const contentType = 'image/jpeg';
      const filePath = `${userId}${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('user-profilePictures')
        .upload(filePath, req.file.buffer, {
          upsert: true,
          contentType,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        return res.status(500).json({ message: 'Kép feltöltése sikertelen.' });
      }

      storagePath = filePath;

      const expiresIn = 7 * 24 * 60 * 60;
      const { data, error } = await supabaseAdmin.storage
        .from('user-profilePictures')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('❌ Signed URL create error:', error);
        return res.status(500).json({ message: 'Signed URL generálása sikertelen.' });
      }

      signedUrlToSave = data.signedUrl;
    }

    const userAllowed = ['name', 'address', 'phoneNumber'];
    const userFields = {};

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) userFields[k] = updateFields[k];
    }

    if (signedUrlToSave) userFields.pictureUrl = signedUrlToSave;

    if (Object.keys(userFields).length) {
      const { error } = await supabaseAdmin
        .from('users')
        .update(userFields)
        .eq('id', userId);
      if (error) throw error;
    }

    const { data: userRow, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (fetchErr) throw fetchErr;
    if (!userRow) return res.status(404).json({ message: 'User not found' });

    const { user: u, related } = await buildProfile(userRow);
    const loggedUser = { user: u, related };

    return res.status(200).json({
      user: loggedUser,
      picture: {
        path: storagePath,
        url: userRow.pictureUrl
      }
    });

  } catch (error) {
    console.error('❌ Error updating admin profile:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.loadPendingOrDeniedDoctors = async (req, res) => {
  try {
    const raw = (req.body?.status || '').toString().trim();
    const status = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        message: 'Érvénytelen status. Engedélyezett: "Pending" vagy "Denied".',
      });
    }

    const { data: doctors, error: dErr } = await supabaseAdmin
      .from('doctors')
      .select('id,userId,speciality,introduction,registDate,avgRating,status')
      .eq('status', status);

    if (dErr) throw dErr;

    const list = doctors ?? [];
    if (!list.length) return res.status(200).json([]);

    const userIds = Array.from(new Set(list.map(d => d.userId).filter(Boolean)));
    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id,name,email,role,phoneNumber,address,pictureUrl')
      .in('id', userIds);

    if (uErr) throw uErr;

    const userMap = new Map((users ?? []).map(u => [u.id, u]));

    const result = list.map((doctor) => {
      const u = userMap.get(doctor.userId);
      return {
        user: {
          id: u?.id,
          name: u?.name,
          email: u?.email,
          role: u?.role,
          phoneNumber: u?.phoneNumber,
          address: u?.address ?? undefined,
          pictureUrl: u?.pictureUrl,
        },
        doctor: {
          id: doctor.id,
          speciality: doctor.speciality,
          introduction: doctor.introduction ?? null,
          avgRating: doctor.avgRating ?? null,
          registDate: doctor.registDate ?? null,
          status: doctor.status,
        }
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Orvosok lekérési hiba (status alapján):', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.setDoctorStatus = async (req, res) => {
  try {
    const { doctorId, status } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: 'Hiányzik a doctorId.' });
    }
    if (!status) {
      return res.status(400).json({ message: 'Hiányzik a status.' });
    }

    const ALLOWED = new Map([
      ['approved', 'Approved'],
      ['pending',  'Pending'],
      ['denied',   'Denied'],
    ]);

    const normalized = ALLOWED.get(String(status).trim().toLowerCase());
    if (!normalized) {
      return res.status(400).json({
        message: 'Érvénytelen status. Használható: Approved | Pending | Denied',
      });
    }

    const id = String(doctorId).trim();

    const { data: existing, error: getErr } = await supabaseAdmin
      .from('doctors')
      .select('id,status')
      .eq('id', id)
      .single();

    if (getErr || !existing) {
      return res.status(404).json({ message: 'Doctor nem található.' });
    }

    if (existing.status === normalized) {
      return res.status(200).json({
        message: 'A státusz már be van állítva.',
        doctorId: id,
        status: normalized,
        previousStatus: existing.status,
      });
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from('doctors')
      .update({ status: normalized })
      .eq('id', id)
      .select('id,status')
      .limit(1);

    if (upErr) {
      console.error('❌ Supabase update error:', upErr);
      return res
        .status(500)
        .json({ message: 'Szerverhiba a státusz frissítésekor.' });
    }

    if (!updated || updated.length === 0) {
      return res
        .status(500)
        .json({ message: 'Nem sikerült frissíteni a státuszt.' });
    }

    return res.status(200).json({
      message: 'Státusz frissítve.',
      doctorId: id,
      status: updated[0].status,
      previousStatus: existing.status,
    });
  } catch (e) {
    console.error('❌ setDoctorStatus hiba:', e);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    // 1) Patients
    const { data: patients, error: pErr } = await supabaseAdmin
      .from('patients')
      .select('id,userId,height,weight,taj,homePhone,registDate,gender')
      .range(offset, offset + limit - 1);

    if (pErr) throw pErr;

    const list = patients ?? [];
    if (!list.length) return res.status(200).json([]);

    const userIds = Array.from(new Set(list.map(r => r.userId).filter(Boolean)));
    let users = [];
    if (userIds.length) {
      let userQuery = supabaseAdmin
        .from('users')
        .select('id,name,email,role,phoneNumber,address,pictureUrl')
        .in('id', userIds);

      if (q) userQuery = userQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);

      const { data: uData, error: uErr } = await userQuery;
      if (uErr) throw uErr;
      users = uData ?? [];
    }

    const userMap = new Map(users.map(u => [u.id, u]));
    const filteredPatients = q ? list.filter(p => userMap.has(p.userId)) : list;
    if (!filteredPatients.length) return res.status(200).json([]);

    const patientIds = filteredPatients.map(p => p.id);
    let tagsByPatient = new Map();
    if (patientIds.length) {
      const { data: tags, error: tErr } = await supabaseAdmin
        .from('patient_tags')
        .select('id, patientId:patient_id, tag_name, tag_value')
        .in('patient_id', patientIds);

      if (tErr) throw tErr;

      tagsByPatient = new Map();
      for (const t of (tags ?? [])) {
        if (!tagsByPatient.has(t.patientId)) tagsByPatient.set(t.patientId, []);
        tagsByPatient.get(t.patientId).push({
          id: t.id,
          tag_name: t.tag_name,
          tag_value: t.tag_value
        });
      }
    }

    const assembled = filteredPatients.map(p => {
      const u = userMap.get(p.userId);
      return {
        user: {
          id: u?.id,
          name: u?.name,
          email: u?.email,
          role: u?.role,
          phoneNumber: u?.phoneNumber,
          address: u?.address ?? undefined,
          pictureUrl: u?.pictureUrl ?? undefined
        },
        patient: {
          id: p.id,
          userId: p.userId,
          height: p.height,
          weight: p.weight,
          taj: p.taj,
          homePhone: p.homePhone,
          registDate: p.registDate,
          gender: p.gender,
          tags: tagsByPatient.get(p.id) ?? []
        }
      };
    });

    assembled.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));

    return res.status(200).json(assembled);
  } catch (err) {
    console.error('❌ Páciensek lekérdezési hiba (Supabase, több lépés):', err);
    return res.status(500).json({
      message: 'Hiba történt a páciensek lekérdezésekor.',
      error: err.message || String(err)
    });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const { data: doctors, error: dErr } = await supabaseAdmin
      .from('doctors')
      .select('id,userId,speciality,introduction,registDate,avgRating')
      .or('status.neq.Pending')
      .range(offset, offset + limit - 1);

    if (dErr) throw dErr;
    const list = doctors ?? [];
    if (!list.length) return res.status(200).json([]);

    const userIds = Array.from(new Set(list.map(r => r.userId).filter(Boolean)));
    let users = [];
    if (userIds.length) {
      let uQ = supabaseAdmin
        .from('users')
        .select('id,name,email,role,phoneNumber,address,pictureUrl')
        .in('id', userIds);

      if (q) {
        uQ = uQ.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data: uData, error: uErr } = await uQ;
      if (uErr) throw uErr;
      users = uData ?? [];
    }

    const userMap = new Map(users.map(u => [u.id, u]));

    const filtered = q ? list.filter(d => userMap.has(d.userId)) : list;
    if (!filtered.length) return res.status(200).json([]);

    const result = filtered.map(d => {
      const u = userMap.get(d.userId);
      return {
        user: {
          id: u?.id,
          name: u?.name,
          email: u?.email,
          role: u?.role,
          phoneNumber: u?.phoneNumber,
          address: u?.address ?? undefined,
          pictureUrl: u?.pictureUrl ?? undefined
        },
        doctor: {
          id: d.id,
          userId: d.userId,
          speciality: d.speciality,
          introduction: d.introduction,
          registDate: d.registDate,
          avgRating: d.avgRating
        }
      };
    });

    result.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba a /doctors (Supabase) lekérésnél:', err);
    return res.status(500).json({ message: 'Szerverhiba.', error: err.message || String(err) });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const { data: admins, error: aErr } = await supabaseAdmin
      .from('admins')
      .select('id,userId,registDate')
      .range(offset, offset + limit - 1);

    if (aErr) throw aErr;
    const list = admins ?? [];
    if (!list.length) return res.status(200).json([]);

    const userIds = Array.from(new Set(list.map(r => r.userId).filter(Boolean)));
    let users = [];
    if (userIds.length) {
      let uQ = supabaseAdmin
        .from('users')
        .select('id,name,email,role,phoneNumber,address,pictureUrl')
        .in('id', userIds);

      if (q) {
        uQ = uQ.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data: uData, error: uErr } = await uQ;
      if (uErr) throw uErr;
      users = uData ?? [];
    }

    const userMap = new Map(users.map(u => [u.id, u]));
    const filtered = q ? list.filter(a => userMap.has(a.userId)) : list;
    if (!filtered.length) return res.status(200).json([]);

    const result = filtered.map(a => {
      const u = userMap.get(a.userId);
      return {
        user: {
          id: u?.id,
          name: u?.name,
          email: u?.email,
          role: u?.role,
          phoneNumber: u?.phoneNumber,
          address: u?.address ?? undefined,
          pictureUrl: u?.pictureUrl ?? undefined
        },
        admin: {
          id: a.id,
          userId: a.userId,
          registDate: a.registDate
        }
      };
    });

    result.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba a /admins (Supabase) lekérésnél:', err);
    return res.status(500).json({ message: 'Szerverhiba.', error: err.message || String(err) });
  }
};

exports.deleteUsers = async (req, res) => {
  try {
    const raw = req.body?.userIds;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ message: 'Hiányzó vagy üres userIds tömb.' });
    }

    const ids = Array.from(
      new Set(
        raw
          .map(v => String(v).trim())
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      return res.status(400).json({ message: 'Nem található érvényes felhasználó ID.' });
    }

    const { data: deletedRows, error } = await supabaseAdmin
      .from('users')
      .delete()
      .in('id', ids)
      .select('id,role');

    if (error) {
      console.error('❌ Supabase delete error:', error);
      return res.status(500).json({ message: 'Szerverhiba a felhasználók törlése közben.' });
    }

    const deletedCount = deletedRows?.length ?? 0;
    const roles = Array.from(
      new Set(
        (deletedRows ?? [])
          .map(r => r?.role)
          .filter(Boolean)
      )
    );

    return res.status(200).json({
      message: deletedCount > 0 ? 'Felhasználók sikeresen törölve.' : 'Nem történt törlés.',
      roles,
    });
  } catch (err) {
    console.error('❌ Hiba a users törlése közben:', err);
    return res.status(500).json({ message: 'Szerverhiba a felhasználók törlése közben.' });
  }
};

exports.registerPatient = async (req, res) => {
  let created = null;
  try {
    const {
      name, email, password, phoneNumber, taj, address, birthDate,
      height, weight, homePhone, gender
    } = req.body;

    if (!name || !email || !password || !phoneNumber || !address || !birthDate || !taj || !gender) {
      return res.status(400).json({ message: 'Név, e-mail, jelszó, telefonszám, cím, születési dátum, TAJ és nem kötelező.' });
    }

    const emailNorm     = String(email).trim().toLowerCase();
    const phoneE164     = toE164HU(phoneNumber);
    if (!phoneE164) {
      return res.status(400).json({ message: 'Hibás telefonszám (HU, E.164).' });
    }
    const birthDateYMD  = toYMD(birthDate);
    if (!birthDateYMD) {
      return res.status(400).json({ message: 'Hibás születési dátum.' });
    }
    const registDateYMD = toYMD(new Date());

    const existing = await UserRepository.findByEmail(emailNorm);
    if (existing) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    const { data: createdData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
      user_metadata: { name, role: 'patient' }
    });
    if (createErr) {
      return res.status(400).json({ message: createErr.message });
    }
    created = createdData;

    const user = await UserProfileService.createUserWithProfile({
      name,
      email: emailNorm,
      phoneNumber: phoneE164,
      address: String(address).trim(),
      authUid: created.user.id,
      role: 'patient',
      pictureUrl: PATIENT_DEFAULT_PICTURE,
      profile: {
        gender: String(gender).trim(),
        height: height ?? null,
        weight: weight ?? null,
        birthDate: birthDateYMD,
        taj: String(taj).trim(),
        homePhone: homePhone ? String(homePhone).trim() : null,
        registDate: registDateYMD
      }
    });

    return res.status(201).json({
      message: 'Páciens regisztráció sikeres.',
      user
    });

  } catch (error) {
    try {
      if (created?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(created?.user.id);
      }
    } catch (e) {
      console.warn('Supabase user cleanup failed:', e?.message || e);
    }

    console.error('Hiba a páciens regisztráció során:', error);
    const pgCode = error?.code;
    const msg = error?.detail || error?.message || 'Szerverhiba a regisztráció közben.';
    const status = (pgCode === '23502' || pgCode === '23505') ? 400 : 500;
    return res.status(status).json({ message: msg });
  }
}

exports.registerDoctor = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, speciality, introduction = null } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Név és e-mail megadása kötelező.' });
    }

    const emailNorm     = String(email).trim().toLowerCase();
    const phoneE164     = toE164HU(phoneNumber);
    const registDateYMD = toYMD(new Date());

    const existing = await UserRepository.findByEmail(emailNorm);
    if (existing) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    let created, createErr, inviteLink = null;
    if (password) {
      ({ data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        password: String(password),
        email_confirm: true,
        user_metadata: { name, role: 'doctor' }
      }));
    } else {
      ({ data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        email_confirm: true,
        user_metadata: { name, role: 'doctor' }
      }));
      if (!createErr && created?.user) {
        const { data: linkData, error: linkErr } =
          await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email: emailNorm });
        if (!linkErr) inviteLink = linkData?.properties?.action_link || null;
      }
    }
    if (createErr) return res.status(400).json({ message: createErr.message });

    const user = await UserProfileService.createUserWithProfile({
      name,
      email: emailNorm,
      phoneNumber: phoneE164,
      authUid: created.user.id,
      role: 'doctor',
      pictureUrl: DOCTOR_DEFAULT_PICTURE,
      profile: {
        speciality,
        introduction,
        avgRating: 0,
        registDate: registDateYMD,
        status: 'Pending'
      }
    });

    return res.status(201).json({
      message: 'Orvos regisztráció sikeres.',
      user,
      inviteLink
    });

  } catch (error) {
    console.error('Hiba az orvos regisztráció során:', error);
    return res.status(500).json({ message: 'Szerverhiba a regisztráció közben.' });
  }
}

exports.registerAdmin = async (req, res) => {
  let created = null;
  try {
    const {
      name, email, password,
      phoneNumber, address
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Név, e-mail és jelszó kötelező.' });
    }

    const emailNorm= String(email).trim().toLowerCase();
    const phoneE164= toE164HU(phoneNumber);
    const registDateYMD= toYMD(new Date());

    const existing = await findByEmail(emailNorm);
    if (existing) {
      return res.status(400).json({ message: 'Ez az e-mail már használatban van.' });
    }

    const { data: createdData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
      user_metadata: { name, role: 'admin' }
    });
    if (createErr) {
      return res.status(400).json({ message: createErr.message });
    }
    created = createdData;

    const user = await createUserWithProfile({
      name,
      email: emailNorm,
      phoneNumber: phoneE164 || null,
      address: address ? String(address).trim() : null,
      authUid: created.user.id,
      role: 'admin',
      pictureUrl: ADMIN_DEFAULT_PICTURE,
      profile: {
        registDate: registDateYMD
      }
    });

    return res.status(201).json({
      message: 'Admin regisztráció sikeres.',
      user
    });

  } catch (error) {
    try {
      if (created?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      }
    } catch (e) {
      console.warn('Supabase user cleanup failed:', e?.message || e);
    }

    console.error('Hiba az admin regisztráció során:', error);
    const pgCode = error?.code;
    const msg = error?.detail || error?.message || 'Szerverhiba a regisztráció közben.';
    const status = (pgCode === '23502' || pgCode === '23505') ? 400 : 500;
    return res.status(status).json({ message: msg });
  }
}

exports.createSystemMessage = async (req, res) => {
  try {
    let { adminId, title, message, type = 'info', audience = 'all', validUntil } = req.body || {};

    title = (title ?? '').trim();
    message = (message ?? '').trim();
    type = String(type || '').toLowerCase();
    audience = String(audience || '').toLowerCase();

    if (!adminId || !title || !message) {
      return res.status(400).json({ message: 'adminId, title és message kötelező.' });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ message: 'Érvénytelen típus (info | warning | error | success).' });
    }
    if (!ALLOWED_AUDIENCE.has(audience)) {
      return res.status(400).json({ message: 'Érvénytelen célközönség (all | patient | doctor | admin).' });
    }

    const adminRow = await sql`SELECT id FROM admins WHERE id = ${adminId} LIMIT 1`;
    if (!adminRow || adminRow.length === 0) {
      return res.status(404).json({ message: 'A megadott admin nem található.' });
    }

    let validUntilDate = null;
    if (validUntil != null && validUntil !== '') {
      const raw = String(validUntil);
      const ymd = raw.includes('T') ? raw.split('T')[0] : raw;

      if (!isYmd(ymd)) {
        return res.status(400).json({ message: 'A lejárat dátuma érvénytelen (YYYY-MM-DD).' });
      }
      const today = todayUtcYmd();
      if (ymd <= today) {
        return res.status(400).json({ message: 'A lejárat dátumának a mai napnál későbbinek kell lennie.' });
      }
      validUntilDate = ymd;
    }

    const created = await SystemMessageRepository.create({
      adminId,
      title,
      message,
      type,
      audience,
      valid_until: validUntilDate,
      created_at: new Date()
    });

    return res.status(201).json({ message: 'Rendszerüzenet mentve.', data: created });
  } catch (err) {
    console.error('Rendszerüzenet mentési hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.listSystemMessages = async (_req, res) => {
  try {
    const { data: messages, error: mErr } = await supabaseAdmin
      .from('system_messages')
      .select('id, adminId, title, message, type, audience, valid_until, created_at')
      .order('created_at', { ascending: false });
    if (mErr) throw mErr;

    if (!messages || messages.length === 0) {
      return res.status(200).json([]);
    }

    const adminIds = Array.from(new Set(messages.map(m => m.adminId).filter(Boolean)));
    const { data: admins, error: aErr } = await supabaseAdmin
      .from('admins')
      .select('id, userId, registDate')
      .in('id', adminIds);
    if (aErr) throw aErr;

    const userIds = Array.from(new Set((admins ?? []).map(a => a.userId).filter(Boolean)));
    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, phoneNumber, address, pictureUrl')
      .in('id', userIds);
    if (uErr) throw uErr;

    const adminMap = new Map((admins ?? []).map(a => [a.id, a]));
    const userMap  = new Map((users ?? []).map(u => [u.id, u]));

    const result = messages.map(m => {
      const a = adminMap.get(m.adminId);
      const u = a ? userMap.get(a.userId) : undefined;

      return {
        id: m.id,
        adminId: m.adminId,
        title: m.title,
        message: m.message,
        type: m.type,
        audience: m.audience,
        valid_until: m.valid_until ?? null,
        created_at: m.created_at,
        admin: {
          user: u ? {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            phoneNumber: u.phoneNumber,
            address: u.address ?? null,
            pictureUrl: u.pictureUrl ?? null
          } : null,
          admin: a ? {
            id: a.id,
            userId: a.user_id,
            registDate: a.registDate
          } : null
        }
      };
    });

    return res.status(200).json(result);
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

    const { data, error } = await supabaseAdmin
      .from('system_messages')
      .delete()
      .eq('id', id)
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      return res.status(500).json({ message: 'Adatbázis hiba a törlés közben.' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Rendszerüzenet nem található.', id });
    }

    return res.status(200).json({ message: 'Rendszerüzenet törölve.', id: data[0].id });
  } catch (err) {
    console.error('❌ Rendszerüzenet törlési hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
};

exports.publishAiConfig = async (req, res) => {
  try {
    const { role, config } = req.body;

    if (!role || !config) {
      return res.status(400).json({ message: 'Hiányzik a role vagy a config.' });
    }

    const filePath = (role === 'patient') ? 'patient-assistant.json' :
      (role === 'doctor') ? 'doctor-assistant.json' :
        null;

    if (!filePath) {
      return res.status(400).json({ message: 'Érvénytelen role.' });
    }

    const body = JSON.stringify(config, null, 2);

    const { error } = await supabaseAdmin.storage
      .from('chatbots')
      .upload(filePath, new Blob([body], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
      });

    if (error) {
      console.error('❌ Supabase Storage publish hiba:', error);
      return res.status(500).json({ message: 'A Storage publikálása sikertelen.' });
    }

    return res.status(200).json({
      message: `${role} konfiguráció sikeresen publikálva.`,
      publishedConfig: config
    });

  } catch (err) {
    console.error('❌ publishAiConfig hiba:', err);
    return res.status(500).json({ message: 'Szerverhiba a publikálás közben.' });
  }
};
