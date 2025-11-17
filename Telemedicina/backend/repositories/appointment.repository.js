const sql2 = require('../config/db.config');

async function listByDoctorId(doctorId) {
  return sql2`
    SELECT id,
           doctor_id  AS "doctor_id",
           patient_id AS "patient_id",
           starts_at,
           ends_at,
           status
    FROM appointments
    WHERE doctor_id = ${doctorId}
    ORDER BY starts_at ASC
  `;
}

const AppointmentRepository = {
  async create({ doctor_id, patient_id = null, starts_at, ends_at, status = 'free' }) {
    const [row] = await sql2`
      INSERT INTO appointments (doctor_id, patient_id, starts_at, ends_at, status)
      VALUES (${doctor_id}, ${patient_id}, ${starts_at}, ${ends_at}, ${status})
      RETURNING id, doctor_id AS "doctor_id", patient_id AS "patient_id",
      starts_at, ends_at, status
      `;
    return row;
  },

  async list({ doctorId, patientId, status, from, to, limit = 50, offset = 0 } = {}) {
    const where = [];
    if (doctorId != null) where.push(sql2`doctor_id = ${doctorId}`);
    if (patientId != null) where.push(sql2`patient_id = ${patientId}`);
    if (status != null) where.push(sql2`status = ${status}`);
    if (from) where.push(sql2`starts_at >= ${from}`);
    if (to) where.push(sql2`ends_at <= ${to}`);

    return sql2`
      SELECT id,
             doctor_id  AS "doctor_id",
             patient_id AS "patient_id",
             starts_at,
             ends_at,
             status
      FROM appointments ${where.length ? sql2`WHERE ${sql2(where.join(' AND '))}` : sql2``}
      ORDER BY starts_at ASC
        LIMIT ${limit}
      OFFSET ${offset}
    `;
  },

  async listByDoctorUserId({ userId, getDoctorByUserIdFunc }) {
    const doctor = await getDoctorByUserIdFunc(userId);

    if (!doctor || !doctor.id) {
      return null;
    }

    const doctorId = doctor.id;

    return await listByDoctorId(doctorId);
  },

  async registerToAppointment({ doctorId, patientIdStr, fromStr, toStr, supabaseAdmin }) {
    const doctorIdNorm = Number(doctorId);
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('appointments')
      .update({
        patient_id: patientIdStr,
        status: 'pending'
      })
      .eq('doctor_id', doctorIdNorm)
      .eq('starts_at', fromStr)
      .eq('ends_at', toStr)
      .is('patient_id', null)
      .select('id')
      .limit(1);

    if (updErr) {
      throw { type: 'DatabaseError', message: String(updErr.message || updErr), code: 500 };
    }

    if (!Array.isArray(updated) || updated.length === 0) {
      const { data: probe, error: probeErr } = await supabaseAdmin
        .from('appointments')
        .select('id, patient_id')
        .eq('doctor_id', doctorIdNorm)
        .eq('starts_at', fromStr)
        .eq('ends_at', toStr)
        .limit(1);

      if (probeErr) {
        throw { type: 'DatabaseError', message: String(probeErr.message || probeErr), code: 500 };
      }

      if (!probe || probe.length === 0) {
        throw { type: 'NotFoundError', message: 'Nem található ilyen időpont (doctor_id + from + to).', code: 404 };
      }

      throw { type: 'ConflictError', message: 'Ez az időpont már foglalt.', code: 409, appointment: probe[0] };
    }

    return updated[0];
  },

  async cancelAppointmentById({appointmentIdRaw, supabaseAdmin}) {
    const idNum = Number(appointmentIdRaw);
    const idStr = String(appointmentIdRaw).trim();

    async function clearAppointmentPatientBy(value) {
      return supabaseAdmin
        .from('appointments')
        .update({patient_id: null, status: 'free'})
        .eq('id', value)
        .select('id')
        .single();
    }

    let apptResp = Number.isFinite(idNum) ? await clearAppointmentPatientBy(idNum) : null;

    if (!apptResp || apptResp.error?.code === 'PGRST116') {
      apptResp = await clearAppointmentPatientBy(idStr);
    }

    if (apptResp.error) {
      if (apptResp.error.code === 'PGRST116') {
        throw {type: 'NotFoundError', message: 'Nem található ilyen appointment.', code: 404};
      }
      throw {type: 'DatabaseError', message: String(apptResp.error.message || apptResp.error), code: 500};
    }

    const appointmentId = apptResp.data?.id ?? (Number.isFinite(idNum) ? idNum : idStr);

    async function clearEncounterPatientBy(value) {
      return supabaseAdmin
        .from('encounters')
        .update({patient_id: null})
        .eq('appointment_id', value)
        .select('id, appointment_id');
    }

    let encResp = Number.isFinite(idNum) ? await clearEncounterPatientBy(idNum) : null;
    if (!encResp || encResp.error) {
      encResp = await clearEncounterPatientBy(idStr);
    }

    if (encResp.error) {
      throw {
        type: 'PartialDatabaseError',
        message: 'Időpont lemondva, de az encounter(ek) frissítése nem sikerült.',
        error: String(encResp.error.message || encResp.error),
        appointmentId: appointmentId,
        code: 500
      };
    }

    return {appointmentId: appointmentId};
  }
};

module.exports = AppointmentRepository;
