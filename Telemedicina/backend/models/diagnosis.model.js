const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const C = 'diagnoses';

exports.create = async (data) => {
  const id = await nextId(C);
  await doc(C, id).set({
    id,
    appointment_id: data.appointmentId ? String(data.appointmentId) : null,
    patient_id: String(data.patientId),
    doctor_id: data.doctorId ? String(data.doctorId) : null,

    chiefComplaint: data.chiefComplaint,
    onsetDate: data.onsetDate ? new Date(data.onsetDate) : null,
    history: data.history ?? null,

    bpSys: data.bpSys ?? null,
    bpDia: data.bpDia ?? null,
    heartRate: data.heartRate ?? null,
    tempC: data.tempC != null ? Number(data.tempC) : null,
    spo2: data.spo2 ?? null,
    weightKg: data.weightKg != null ? Number(data.weightKg) : null,
    heightCm: data.heightCm != null ? Number(data.heightCm) : null,
    bmi: data.bmi != null ? Number(data.bmi) : null,
    examSummary: data.examSummary ?? null,

    primaryText: data.primaryText,
    codeSystem: data.codeSystem ?? null,
    code: data.code ?? null,
    certaintyPct: data.certaintyPct ?? null,
    severity: data.severity ?? null,
    differentials: data.differentials ?? null,

    assessment: data.assessment ?? null,
    planText: data.planText ?? null,
    redFlags: !!data.redFlags,
    informed: !!data.informed,
    createdAt: new Date()
  });
  return { id };
};

exports.listForPatient = async (patientId) => {
  const q = await col('diagnoses').where('patient_id', '==', String(patientId)).get();
  return q.docs.map(d => d.data());
};

exports.getByAppointment = async (appointmentId) => {
  const q = await col(C).where('appointment_id', '==', String(appointmentId)).get();
  return q.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.delete = async (id) => {
  await doc('diagnoses', id).delete();
};
