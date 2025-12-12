const sql = require('../config/db.config');
const {deleteById} = require("./user.repository");

const AdminRepository = {
  async create({ userId, registDate = null }, client = sql) {
      const [row] = await client`
      INSERT INTO admins ("userId", "registDate")
      VALUES (${userId}, ${registDate})
      RETURNING id, "userId" AS "userId", "registDate" AS "registDate"
    `;
    return row;
  },

  async updateUserProfile(userId, userFields, supabaseAdmin) {
    if (Object.keys(userFields).length) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(userFields)
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Supabase user update error:', updateError);
        throw { type: 'DatabaseError', message: 'Hiba a felhasználói adatok frissítésekor.', error: String(updateError.message || updateError), code: 500 };
      }
    }

    const { data: userRow, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        throw { type: 'NotFoundError', message: 'User not found.', code: 404 };
      }
      console.error('❌ Supabase user fetch error:', fetchErr);
      throw { type: 'DatabaseError', message: 'Hiba a frissített adatok lekérésekor.', error: String(fetchErr.message || fetchErr), code: 500 };
    }

    if (!userRow) {
      throw { type: 'NotFoundError', message: 'User not found.', code: 404 };
    }

    return userRow;
  },

  async getByUserId(userId, client = sql) {
      const [row] = await client`
      SELECT id, "userId" AS "userId", "registDate" AS "registDate"
      FROM admins
      WHERE "userId" = ${userId}
    `;
    return row || null;
  },

  async updateDoctorStatus(doctorId, normalizedStatus, supabaseAdmin) {
    const id = String(doctorId).trim();

    const { data: existing, error: getErr } = await supabaseAdmin
      .from('doctors')
      .select('id,status')
      .eq('id', id)
      .single();

    if (getErr || !existing) {
      if (getErr?.code === 'PGRST116') {
        throw { type: 'NotFoundError', message: 'Doctor nem található.', code: 404 };
      }
      console.error('❌ Supabase doctor lookup error:', getErr);
      throw { type: 'DatabaseError', message: 'Hiba az orvos státuszának lekérésekor.', code: 500, error: String(getErr.message || getErr) };
    }

    if (existing.status === normalizedStatus) {
      return {
        message: 'A státusz már be van állítva.',
        doctorId: id,
        status: normalizedStatus,
        previousStatus: existing.status,
      };
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from('doctors')
      .update({ status: normalizedStatus })
      .eq('id', id)
      .select('id,status')
      .limit(1);

    if (upErr) {
      console.error('❌ Supabase update error:', upErr);
      throw { type: 'DatabaseError', message: 'Szerverhiba a státusz frissítésekor.', code: 500, error: String(upErr.message || upErr) };
    }

    if (!updated || updated.length === 0) {
      throw { type: 'DatabaseError', message: 'Nem sikerült frissíteni a státuszt.', code: 500 };
    }

    return {
      message: 'Státusz frissítve.',
      doctorId: id,
      status: updated[0].status,
      previousStatus: existing.status,
    };
  },

  async listPatientsWithDetailsAndFilter({ q = '', limit = 100, offset = 0, supabaseAdmin }) {
    limit = Math.min(limit, 500);
    offset = Math.max(offset, 0);

    const { data: patients, error: pErr } = await supabaseAdmin
      .from('patients')
      .select('id,userId,height,weight,taj,homePhone,registDate,gender')
      .range(offset, offset + limit - 1);

    if (pErr) {
      throw { type: 'DatabaseError', message: 'Páciensek profil lekérdezési hiba.', error: String(pErr.message || pErr), code: 500 };
    }

    const list = patients ?? [];
    if (!list.length) return [];

    const userIds = Array.from(new Set(list.map(r => r.userId).filter(Boolean)));
    let users = [];

    if (userIds.length) {
      let userQuery = supabaseAdmin
        .from('users')
        .select('id,name,email,role,phoneNumber,address,pictureUrl')
        .in('id', userIds);

      if (q) {
        userQuery = userQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data: uData, error: uErr } = await userQuery;
      if (uErr) {
        throw { type: 'DatabaseError', message: 'Felhasználói adatok lekérdezési hiba.', error: String(uErr.message || uErr), code: 500 };
      }
      users = uData ?? [];
    }

    const userMap = new Map(users.map(u => [u.id, u]));

    const filteredPatients = q ? list.filter(p => userMap.has(p.userId)) : list;
    if (!filteredPatients.length) return [];

    const patientIds = filteredPatients.map(p => p.id);
    let tagsByPatient = new Map();

    if (patientIds.length) {
      const { data: tags, error: tErr } = await supabaseAdmin
        .from('patient_tags')
        .select('id, patientId:patient_id, tag_name, tag_value')
        .in('patient_id', patientIds);

      if (tErr) {
        throw { type: 'DatabaseError', message: 'Páciens tagek lekérdezési hiba.', error: String(tErr.message || tErr), code: 500 };
      }

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
          id: u?.id ?? null,
          name: u?.name ?? null,
          email: u?.email ?? null,
          role: u?.role ?? null,
          phoneNumber: u?.phoneNumber ?? null,
          address: u?.address ?? undefined,
          pictureUrl: u?.pictureUrl ?? undefined
        },
        patient: {
          id: p.id,
          userId: p.userId,
          height: p.height ?? null,
          weight: p.weight ?? null,
          taj: p.taj ?? null,
          homePhone: p.homePhone ?? null,
          registDate: p.registDate ?? null,
          gender: p.gender ?? null,
          tags: tagsByPatient.get(p.id) ?? []
        }
      };
    });

    assembled.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));

    return assembled;
  },

  async listDoctorsWithUsersAndFilter({ q = '', limit = 100, offset = 0, supabaseAdmin }) {
    limit = Math.min(limit, 500);
    offset = Math.max(offset, 0);

    const { data: doctors, error: dErr } = await supabaseAdmin
      .from('doctors')
      .select('id,userId,speciality,introduction,registDate,avgRating,status')
      .or('status.neq.Pending')
      .range(offset, offset + limit - 1);

    if (dErr) {
      throw { type: 'DatabaseError', message: 'Orvosok lekérési hiba.', error: String(dErr.message || dErr), code: 500 };
    }

    const list = doctors ?? [];
    if (!list.length) return [];

    const userIds = Array.from(new Set(list.map(d => d.userId).filter(Boolean)));
    let users = [];

    if (userIds.length) {
      let userQuery = supabaseAdmin
        .from('users')
        .select('id,name,email,role,phoneNumber,address,pictureUrl')
        .in('id', userIds);

      if (q) {
        userQuery = userQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data: uData, error: uErr } = await userQuery;
      if (uErr) {
        throw { type: 'DatabaseError', message: 'Felhasználói adatok lekérési hiba.', error: String(uErr.message || uErr), code: 500 };
      }
      users = uData ?? [];
    }

    const userMap = new Map(users.map(u => [u.id, u]));

    const filtered = q ? list.filter(d => userMap.has(d.userId)) : list;
    if (!filtered.length) return [];

    const result = filtered.map(d => {
      const u = userMap.get(d.userId);
      return {
        user: {
          id: u?.id ?? null,
          name: u?.name ?? null,
          email: u?.email ?? null,
          role: u?.role ?? null,
          phoneNumber: u?.phoneNumber ?? null,
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

    return result;
  },

  async listAdminsWithUsersAndFilter({ q = '', limit = 100, offset = 0, supabaseAdmin }) {
    limit = Math.min(limit, 500);
    offset = Math.max(offset, 0);

    const { data: admins, error: aErr } = await supabaseAdmin
      .from('admins')
      .select('id,userId,registDate')
      .range(offset, offset + limit - 1);

    if (aErr) {
      throw { type: 'DatabaseError', message: 'Admin profil lekérési hiba.', error: String(aErr.message || aErr), code: 500 };
    }

    const list = admins ?? [];
    if (!list.length) return [];

    const userIds = Array.from(new Set(list.map(r => r.userId).filter(Boolean)));
    let users = [];

    if (userIds.length) {
      let userQuery = supabaseAdmin
        .from('users')
        .select('id,name,email,role,phoneNumber,address,pictureUrl')
        .in('id', userIds);

      if (q) {
        userQuery = userQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data: uData, error: uErr } = await userQuery;
      if (uErr) {
        throw { type: 'DatabaseError', message: 'Felhasználói adatok lekérési hiba.', error: String(uErr.message || uErr), code: 500 };
      }
      users = uData ?? [];
    }

    const userMap = new Map(users.map(u => [u.id, u]));

    const filtered = q ? list.filter(a => userMap.has(a.userId)) : list;
    if (!filtered.length) return [];

    const result = filtered.map(a => {
      const u = userMap.get(a.userId);
      return {
        user: {
          id: u?.id ?? null,
          name: u?.name ?? null,
          email: u?.email ?? null,
          role: u?.role ?? null,
          phoneNumber: u?.phoneNumber ?? null,
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

    return result;
  },

  async deleteUsersByIds(ids) {
    const usersToDelete = await sql`
    SELECT id, role
    FROM users
    WHERE id IN ${sql(ids)}
  `;

    if (!usersToDelete || usersToDelete.length === 0) {
      return [];
    }

    const deletePromises = usersToDelete.map(async (user) => {
      const success = await deleteById(user.id);

      return success ? user : null;
    });

    const results = await Promise.all(deletePromises);

    return results.filter(user => user !== null);
  }
};

module.exports = AdminRepository;
