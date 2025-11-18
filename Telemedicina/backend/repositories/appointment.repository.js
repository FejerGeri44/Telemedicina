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
  async createAppointmentAndEncounter({ doctor_id, from, to, supabaseAdmin }) {
    const { data: dup, error: dupErr } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('starts_at', from)
      .eq('ends_at', to)
      .limit(1);

    if (dupErr) {
      throw { type: 'DatabaseError', message: String(dupErr.message || dupErr), code: 500, detail: 'Duplication check failed' };
    }
    if (dup && dup.length > 0) {
      throw { type: 'ConflictError', message: 'Ez az időpont már létezik ennél az orvosnál.', code: 409 };
    }

    let insertedAppointment = null;

    try {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('appointments')
        .insert({
          doctor_id,
          patient_id: null,
          starts_at: from,
          ends_at: to,
          status: 'free'
        })
        .select()
        .single();

      if (insErr) {
        throw { type: 'DatabaseError', message: String(insErr.message || insErr), code: 500, detail: 'Appointment insert failed' };
      }
      insertedAppointment = inserted;

      const { data: encounter, error: encErr } = await supabaseAdmin
        .from('encounters')
        .insert([{
          doctor_id: doctor_id,
          appointment_id: inserted.id,
          patient_id: null,
          diagnosis_id: null
        }])
        .select('id, doctor_id, appointment_id, patient_id, diagnosis_id')
        .single();

      if (encErr) {
        throw { type: 'DatabaseError', message: String(encErr.message || encErr), code: 500, detail: 'Encounter insert failed' };
      }

      return {
        id: insertedAppointment.id,
        doctor_id: insertedAppointment.doctor_id,
        patient_id: insertedAppointment.patient_id ?? null,
        from: insertedAppointment.starts_at,
        to: insertedAppointment.ends_at,
        status: insertedAppointment.status
      };

    } catch (error) {
      if (insertedAppointment?.id) {
        console.error(`⚠️ Sikertelen Encounter, kísérlet az Appointment (ID: ${insertedAppointment.id}) visszavonására.`);
        const { error: rollbackErr } = await supabaseAdmin
          .from('appointments')
          .delete()
          .eq('id', insertedAppointment.id)
          .limit(1);

        if (rollbackErr) {
          console.error('⚠️ Rollback sikertelen, kézi takarítás szükséges:', rollbackErr);
        }
      }

      if (error.detail === 'Encounter insert failed') {
        throw {
          ...error,
          message: 'Encounter létrehozása sikertelen, az appointment visszavonva.'
        };
      }

      throw error;
    }
  },

  async updateAppointmentStatusAndHandleRejection({
                                                    appointmentId,
                                                    status,
                                                    userId,
                                                    supabaseAdmin,
                                                    AppointmentRejectionRepository
                                                  }) {
    const { data: doctorRow, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('userId', userId)
      .single();

    if (docErr || !doctorRow) {
      throw { type: 'ForbiddenError', message: 'Nem sikerült azonosítani az orvost.', code: 403 };
    }
    const doctorId = doctorRow.id;

    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, doctor_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      throw { type: 'NotFoundError', message: 'Időpont nem található.', code: 404 };
    }
    if (appt.doctor_id !== doctorId) {
      throw { type: 'ForbiddenError', message: 'Az időpont nem ehhez az orvoshoz tartozik.', code: 403 };
    }

    const newStatus = status === 'approved' ? 'accepted' : 'free';
    const updateFields = { status: newStatus };

    if (status === 'rejected') {
      updateFields.patient_id = null;
    }

    const { data: updatedAppt, error: updErr } = await supabaseAdmin
      .from('appointments')
      .update(updateFields)
      .eq('id', appointmentId)
      .select('id, status, patient_id')
      .single();

    if (updErr) {
      console.error('❌ Supabase update error (appointment status):', updErr);
      throw { type: 'DatabaseError', message: 'Server error: Appointment status update failed.', code: 500 };
    }

    if (status === 'approved') {
      const patientIdToAccept = appt.patient_id;

      if (patientIdToAccept) {
        const { data: encounterRow, error: encErr } = await supabaseAdmin
          .from('encounters')
          .select('id, patient_id')
          .eq('appointment_id', appointmentId)
          .single();

        if (encErr || !encounterRow) {
          console.warn(`⚠️ Sikeres elfogadás, de nem található encounter az appointmentId: ${appointmentId} alapján.`);
        } else {
          const { error: encUpdErr } = await supabaseAdmin
            .from('encounters')
            .update({ patient_id: patientIdToAccept })
            .eq('id', encounterRow.id);

          if (encUpdErr) {
            console.error('❌ Supabase update error (encounter patient_id):', encUpdErr);
            console.warn(`⚠️ Sikeres appointment elfogadás, de az encounter frissítés (patient_id) hibás: ${encUpdErr.message}`);
          } else {
            console.log(`✅ Encounter (ID: ${encounterRow.id}) sikeresen frissítve a patient_id: ${patientIdToAccept} értékkel.`);
          }
        }
      } else {
        console.warn(`⚠️ Sikeres appointment elfogadás, de az eredeti appointment patient_id értéke null volt: ${appointmentId}`);
      }
    }

    if (status === 'rejected') {
      const patientIdToReject = appt.patient_id;

      if (patientIdToReject) {
        const rejection = await AppointmentRejectionRepository.create({
          doctorId,
          patientId: patientIdToReject,
        });
        console.log(`✅ Appointment rejected and recorded: ${rejection.id}`);
      } else {
        console.warn(`⚠️ Appointment rejected, but patient_id was null: ${appointmentId}`);
      }
    }

    return updatedAppt;
  },

  async deleteAppointmentById({ appointmentId, supabaseAdmin }) {
    const { data: deleted, error: delErr } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .select('id')
      .single();

    if (delErr) {
      if (delErr.code === 'PGRST116') {
        throw { type: 'NotFoundError', message: `Appointment not found: ${appointmentId}`, code: 404 };
      }
      console.error('❌ Supabase delete error:', delErr);
      throw { type: 'DatabaseError', message: 'Server error: Appointment deletion failed.', code: 500 };
    }

    return deleted.id;
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
  },

  async listAppointmentsWithPatientAndTagsByDoctorId({ doctorIdRaw, supabaseAdmin }) {
    const idNum = Number(doctorIdRaw);
    const idStr = String(doctorIdRaw).trim();

    const selectStatement = `
      id,
      doctor_id,
      starts_at,
      ends_at,
      status,
      patient:patient_id (
        id, userId, height, weight, birthDate, taj, gender, homePhone, registDate,
        user:userId (
          id, name, email, role, address, phoneNumber, pictureUrl
        )
      )
    `;

    async function fetchByDoctorId(value) {
      return supabaseAdmin
        .from('appointments')
        .select(selectStatement)
        .eq('doctor_id', value)
        .order('starts_at', { ascending: true });
    }

    let { data: appts, error: aErr } =
      Number.isFinite(idNum) ? await fetchByDoctorId(idNum) : await fetchByDoctorId(idStr);

    if (aErr) {
      throw { type: 'DatabaseError', message: String(aErr.message || aErr), code: 500, detail: 'Appointments fetch failed.' };
    }

    if ((!appts || appts.length === 0) && Number.isFinite(idNum)) {
      const retry = await fetchByDoctorId(idStr);
      if (retry.error) {
        throw { type: 'DatabaseError', message: String(retry.error.message || retry.error), code: 500, detail: 'Appointments retry fetch failed.' };
      }
      appts = retry.data || [];
    }

    const apptPatientIds = [...new Set(
      appts
        .map(appt => appt.patient?.id)
        .filter(id => id !== null && id !== undefined)
    )];

    const tagsByPatientId = new Map();
    if (apptPatientIds.length > 0) {
      const { data: tagRows, error: tagsError } = await supabaseAdmin
        .from('patient_tags')
        .select('id, patient_id, tag_name, tag_value')
        .in('patient_id', apptPatientIds);

      if (tagsError) {
        console.error('❌ Supabase patient_tags lekérdezés hiba:', tagsError);
        throw { type: 'PartialError', message: 'Appointment adatok lekérése sikerült, de a páciens tagek lekérése nem.', code: 500, detail: String(tagsError.message || tagsError) };
      }

      (tagRows ?? []).forEach(t => {
        if (!tagsByPatientId.has(t.patient_id)) tagsByPatientId.set(t.patient_id, []);
        tagsByPatientId.get(t.patient_id).push({
          id: t.id,
          patient_id: t.patient_id,
          tag_name: t.tag_name,
          tag_value: t.tag_value
        });
      });
    }

    const transformedAppts = appts.map(appt => {
      if (!appt.patient) {
        return {
          ...appt,
          patient_id: null,
          patient: null,
        };
      }

      const { user, ...patientData } = appt.patient;
      const patientId = patientData.id;

      const tags = tagsByPatientId.get(patientId) ?? [];

      delete appt.patient;

      return {
        ...appt,
        patient_id: patientId,
        patient: {
          user,
          patient: {
            ...patientData,
            tags: tags
          }
        },
      };
    });

    return transformedAppts ?? [];
  },

  async listAppointmentsByPatientAndDoctor({ patientId, doctorId, supabaseAdmin }) {
    const didNum = Number(doctorId);
    const didStr = String(doctorId).trim();
    const pidNum = Number(patientId);
    const pidStr = String(patientId).trim();

    let query = supabaseAdmin
      .from('appointments')
      .select('id, doctor_id, patient_id, starts_at, ends_at, status')
      .order('starts_at', { ascending: true });

    if (Number.isFinite(didNum)) {
      query = query.eq('doctor_id', didNum);
    } else {
      query = query.eq('doctor_id', didStr);
    }

    if (Number.isFinite(pidNum)) {
      query = query.eq('patient_id', pidNum);
    } else {
      query = query.eq('patient_id', pidStr);
    }

    const { data: appts, error: aErr } = await query;

    if (aErr) {
      throw { type: 'DatabaseError', message: String(aErr.message || aErr), code: 500 };
    }

    return appts ?? [];
  }
};

module.exports = AppointmentRepository;
