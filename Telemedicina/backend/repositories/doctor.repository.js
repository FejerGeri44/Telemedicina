const sql = require('../config/db.config');

const DoctorRepository = {
  async create({ userId, speciality, introduction = null, avgRating = 0, registDate, status }, client = sql) {
      const [row] = await client`
      INSERT INTO doctors ("userId", speciality, introduction, "avgRating", "registDate", status)
      VALUES (${userId}, ${speciality}, ${introduction}, ${avgRating}, ${registDate}, ${status})
        RETURNING id,
        "userId" AS "userId",
        speciality, introduction,
        "avgRating" AS "avgRating",
        "registDate" AS "registDate",
        status
    `;
    return row;
  },

  async updateDoctorProfile(userId, userFields, doctorFields, supabaseAdmin) {
    if (Object.keys(userFields).length) {
      const { error } = await supabaseAdmin
        .from('users')
        .update(userFields)
        .eq('id', userId);
      if (error) throw error;
    }

    if (Object.keys(doctorFields).length) {
      const { error } = await supabaseAdmin
        .from('doctors')
        .update(doctorFields)
        .eq('userId', userId);
      if (error) throw error;
    }

    const { data: userRow, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (fetchErr) throw fetchErr;
    if (!userRow) throw new Error('User not found');

    return { userRow };
  },

  async getDoctorWithUserById(doctorId, client = sql) {
    const [row] = await client`
      SELECT
        d.id AS doctor_id,
        d."userId" AS doctor_user_id,
        d.speciality,
        d.introduction,
        d."avgRating" AS avg_rating,
        d.status AS doctor_status,

        u.id AS user_id,
        u.email AS user_email,
        u.name AS user_name,
        u.role AS user_role,
        u."phoneNumber" AS user_phone_number,
        u.address AS user_address,
        u."pictureUrl" AS user_picture_url

      FROM doctors d
             JOIN users u ON d."userId" = u.id
      WHERE d.id = ${doctorId}
        LIMIT 1
    `;

    if (!row) {
      return null;
    }
    return {
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        role: row.user_role,
        phoneNumber: row.user_phone_number,
        address: row.user_address,
        pictureUrl: row.user_picture_url,
      },
      doctor: {
        id: row.doctor_id,
        userId: row.doctor_user_id,
        speciality: row.speciality,
        introduction: row.introduction,
        avgRating: row.avg_rating,
        status: row.doctor_status,
      },
    };
  },

  async getByUserId(userId, client = sql) {
      const [row] = await client`
      SELECT id, "userId" AS "userId", speciality, introduction,
             "avgRating" AS "avgRating", "registDate" AS "registDate", status
      FROM doctors
      WHERE "userId" = ${userId}
    `;
    return row || null;
  },

  async listApprovedDoctorsWithUser(client = sql) {
    const rows = await client`
      SELECT
        d.id AS doctor_id,
        d."userId" AS doctor_user_id,
        d.speciality,
        d.introduction,
        d."avgRating" AS avg_rating,
        d.status AS doctor_status,
        d."registDate" AS regist_date,

        u.id AS user_id,
        u.email AS user_email,
        u.name AS user_name,
        u.role AS user_role,
        u."phoneNumber" AS user_phone_number,
        u.address AS user_address,
        u."pictureUrl" AS user_picture_url

      FROM doctors d
      JOIN users u ON d."userId" = u.id
      WHERE d.status = 'Approved'
      ORDER BY d.id ASC
    `;

    return rows.map(row => ({
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        role: row.user_role,
        phoneNumber: row.user_phone_number,
        address: row.user_address,
        pictureUrl: row.user_picture_url,
      },
      doctor: {
        id: row.doctor_id,
        userId: row.doctor_user_id,
        speciality: row.speciality,
        introduction: row.introduction,
        avgRating: row.avg_rating,
        registDate: row.regist_date,
        status: row.doctor_status,
      },
    }));
  },

  async listMyPatientsWithTagsByUserId(currentUserId, supabaseAdmin) {
    const { data: doc, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('userId', currentUserId)
      .maybeSingle();

    if (docErr) {
      throw { type: 'DatabaseError', message: String(docErr.message || docErr), code: 500, detail: 'Doctor ID lookup failed.' };
    }
    if (!doc) {
      return [];
    }
    const doctorId = doc.id;

    const acceptedStatuses = ['accepted', 'done'];

    const { data: appointments, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', doctorId)
      .in('status', acceptedStatuses);

    if (apptError) {
      throw { type: 'DatabaseError', message: String(apptError.message || apptError), code: 500, detail: 'Appointments lookup failed.' };
    }

    const requiredPatientIds = [...new Set(
      (appointments || [])
        .map(a => a.patient_id)
        .filter(id => id !== null && id !== undefined)
    )];

    if (requiredPatientIds.length === 0) {
      return [];
    }

    const patientSelectStatement = `
      id, userId, height, weight, taj, homePhone, birthDate, registDate, gender,
      user:users (
        id, name, email, role, phoneNumber, address, pictureUrl
      )
    `;

    const { data: patientsData, error: patientsError } = await supabaseAdmin
      .from('patients')
      .select(patientSelectStatement)
      .in('id', requiredPatientIds)
      .order('id', { ascending: true });

    if (patientsError) {
      throw { type: 'DatabaseError', message: String(patientsError.message || patientsError), code: 500, detail: 'Patients data fetch failed.' };
    }

    const patients = Array.isArray(patientsData) ? patientsData : [];
    const patientIds = [...new Set(patients.map(p => p.id))];

    const { data: tagRows, error: tagsError } = await supabaseAdmin
      .from('patient_tags')
      .select('id, patient_id, tag_name, tag_value')
      .in('patient_id', patientIds);

    if (tagsError) {
      console.error('❌ Supabase patient_tags lekérdezés hiba:', tagsError);
    }

    const tagsByPatientId = new Map();
    (tagRows ?? []).forEach(t => {
      if (!tagsByPatientId.has(t.patient_id)) tagsByPatientId.set(t.patient_id, []);
      tagsByPatientId.get(t.patient_id).push({
        id: t.id,
        patient_id: t.patient_id,
        tag_name: t.tag_name,
        tag_value: t.tag_value
      });
    });

    return patients.map(r => ({
      user: r.user ?? null,
      patient: {
        id: r.id,
        userId: r.userId,
        height: r.height ?? null,
        weight: r.weight ?? null,
        taj: r.taj ?? null,
        homePhone: r.homePhone ?? null,
        registDate: r.registDate ?? null,
        gender: r.gender ?? null,
        tags: tagsByPatientId.get(r.id) ?? []
      }
    }));
  },

  async countPendingAppointmentsByDoctorId(doctorId, supabaseAdmin) {
    const { count, error } = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('status', 'pending');

    if (error) {
      console.error('❌ Supabase pending count error in repository:', error);
      throw {
        type: 'DatabaseError',
        message: 'Hiba a függőben lévő időpontok számolásakor.',
        error: String(error.message || error),
        code: 500
      };
    }

    return count ?? 0;
  },

  async countRejectionsByDoctorId(doctorId, supabaseAdmin) {
    const { count, error } = await supabaseAdmin
      .from('appointment_rejection')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId);

    if (error) {
      console.error('❌ Supabase rejection count error in repository:', error);
      throw {
        type: 'DatabaseError',
        message: 'Hiba az elutasítások számolásakor.',
        error: String(error.message || error),
        code: 500
      };
    }

    return count ?? 0;
  },

  async listDoctorsByStatusWithUser(status, supabaseAdmin) {
    const { data: doctors, error: dErr } = await supabaseAdmin
      .from('doctors')
      .select('id,userId,speciality,introduction,registDate,avgRating,status')
      .eq('status', status);

    if (dErr) {
      throw { type: 'DatabaseError', message: 'Orvosok lekérési hiba a megadott státusz alapján.', error: String(dErr.message || dErr), code: 500 };
    }

    const list = doctors ?? [];
    if (!list.length) return [];

    const userIds = Array.from(new Set(list.map(d => d.userId).filter(Boolean)));

    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id,name,email,role,phoneNumber,address,pictureUrl')
      .in('id', userIds);

    if (uErr) {
      throw { type: 'DatabaseError', message: 'Felhasználói adatok lekérési hiba.', error: String(uErr.message || uErr), code: 500 };
    }

    const userMap = new Map((users ?? []).map(u => [u.id, u]));

    return list.map((doctor) => {
      const u = userMap.get(doctor.userId);
      return {
        user: {
          id: u?.id ?? null,
          name: u?.name ?? null,
          email: u?.email ?? null,
          role: u?.role ?? null,
          phoneNumber: u?.phoneNumber ?? null,
          address: u?.address ?? undefined,
          pictureUrl: u?.pictureUrl ?? null,
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
  },

  async updateAvgRating(doctorId, newAvg, client = sql) {
    const [updated] = await client`
      UPDATE doctors
      SET "avgRating" = ${newAvg}
      WHERE id = ${doctorId}
      RETURNING id, "avgRating"
    `;
    return updated;
  }
};

module.exports = DoctorRepository;
