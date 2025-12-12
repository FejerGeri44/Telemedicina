const {buildProfile} = require("../utils/profileBuilder");
const {supabaseAdmin} = require("../utils/supabaseAdmin");
const {findByEmail} = require("../repositories/user.repository");
const {createUserWithProfile} = require("../utils/userProfile");
const UserRepository = require("../repositories/user.repository");
const UserProfileService = require("../utils/userProfile");
const SystemMessageRepository = require("../repositories/systemMessage.repository");
const sql = require("../config/db.config");
const {updateUserProfile, updateDoctorStatus, listAdminsWithUsersAndFilter, listPatientsWithDetailsAndFilter,
  listDoctorsWithUsersAndFilter, deleteUsersByIds
} = require("../repositories/admin.repository");
const {listDoctorsByStatusWithUser} = require("../repositories/doctor.repository");

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
      const { data, error: signedUrlError } = await supabaseAdmin.storage
        .from('user-profilePictures')
        .createSignedUrl(filePath, expiresIn);

      if (signedUrlError) {
        console.error('❌ Signed URL create error:', signedUrlError);
        return res.status(500).json({ message: 'Signed URL generálása sikertelen.' });
      }

      updateFields.pictureUrl = data.signedUrl;
    }

    const userAllowed = ['name', 'address', 'phoneNumber', 'pictureUrl'];
    const userFields = {};

    for (const k of userAllowed) {
      if (updateFields[k] !== undefined) userFields[k] = updateFields[k];
    }


    let userRow;

    if (Object.keys(userFields).length === 0) {
      const { data: fetchRow, error: fetchErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchErr) throw fetchErr;
      if (!fetchRow) return res.status(404).json({ message: 'User not found' });
      userRow = fetchRow;
    } else {
      userRow = await updateUserProfile(userId, userFields, supabaseAdmin);
    }

    const { user: u, related } = await buildProfile(userRow);
    const loggedUser = { user: u, related };

    return res.status(200).json({
      user: loggedUser,
      picture: {
        path: storagePath,
        url: userRow.pictureUrl
      }
    });

  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Server error';

    if (status >= 500) {
      console.error('❌ Error updating admin profile:', err);
    }

    return res.status(status).json({ message, error: String(err?.error || err?.message || err) });
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

    const result = await listDoctorsByStatusWithUser(
      status,
      supabaseAdmin
    );

    return res.status(200).json(result);
  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Szerverhiba.';

    if (status >= 500) {
      console.error('❌ Orvosok lekérési hiba (Repository):', err);
    }

    return res.status(status).json({ message, error: String(err?.error || err?.message || err) });
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
      ['pending', 'Pending'],
      ['denied', 'Denied'],
    ]);

    const normalized = ALLOWED.get(String(status).trim().toLowerCase());
    if (!normalized) {
      return res.status(400).json({
        message: 'Érvénytelen status. Használható: Approved | Pending | Denied',
      });
    }

    const result = await updateDoctorStatus(
      doctorId,
      normalized,
      supabaseAdmin
    );

    if (result.message === 'A státusz már be van állítva.') {
      return res.status(200).json(result);
    }

    return res.status(200).json(result);

  } catch (e) {
    const status = e.code || 500;
    const message = e.message || 'Szerverhiba.';

    if (status >= 500) {
      console.error('❌ setDoctorStatus hiba:', e);
    }

    return res.status(status).json({ message, error: String(e?.error || e?.message || e) });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const assembled = await listPatientsWithDetailsAndFilter({
      q, limit, offset, supabaseAdmin,
    });

    return res.status(200).json(assembled);
  } catch (err) {
    console.error('❌ Páciensek lekérdezési hiba (Repository):', err);
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

    const result = await listDoctorsWithUsersAndFilter({
      q, limit, offset, supabaseAdmin,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba a /doctors (Repository) lekérésnél:', err);
    return res.status(500).json({ message: 'Szerverhiba.', error: err.message || String(err) });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const result = await listAdminsWithUsersAndFilter({
      q, limit, offset, supabaseAdmin,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Hiba a /admins (Repository) lekérésnél:', err);
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

    const deletedRows = await deleteUsersByIds(ids);

    const deletedCount = deletedRows.length;

    const roles = Array.from(
      new Set(
        deletedRows
          .map(r => r?.role)
          .filter(Boolean)
      )
    );

    return res.status(200).json({
      message: deletedCount > 0
        ? `${deletedCount} felhasználó sikeresen törölve.`
        : 'Nem történt törlés (lehet, hogy az ID-k nem léteztek).',
      roles,
    });

  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Szerverhiba a felhasználók törlése közben.';

    console.error('❌ Hiba a users törlése közben:', err);

    return res.status(status).json({ message, error: String(err?.message || err) });
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
    const result = await SystemMessageRepository.listWithAdminDetails(supabaseAdmin);

    return res.status(200).json(result);
  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Szerverhiba.';

    console.error('Rendszerüzenetek listázási hiba:', err);
    return res.status(status).json({ message, error: String(err?.error || err?.message || err) });
  }
};

exports.deleteSystemMessage = async (req, res) => {
  try {
    const { messageId } = req.body || {};
    const id = Number(messageId);

    if (!id || Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'Érvénytelen vagy hiányzó messageId.' });
    }

    const deleted = await SystemMessageRepository.deleteById(id, supabaseAdmin);

    return res.status(200).json({ message: 'Rendszerüzenet törölve.', id: deleted.id });

  } catch (err) {
    const status = err.code || 500;
    const message = err.message || 'Szerverhiba.';

    if (status === 404) {
      return res.status(404).json({ message: message, id: Number(req.body?.messageId) });
    }

    console.error('❌ Rendszerüzenet törlési hiba:', err);
    return res.status(status).json({ message, error: String(err?.error || err?.message || err) });
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
