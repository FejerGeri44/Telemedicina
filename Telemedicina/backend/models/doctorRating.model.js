const { doc, col } = require('./shared/firestore');
const C = 'doctor_ratings';

const makeId = (doctorId, patientId) => `${doctorId}_${patientId}`;

exports.upsert = async ({ doctor_id, patient_id, value }) => {
  const id = makeId(doctor_id, patient_id);
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error('INVALID_RATING');

  await doc(C, id).set({
    doctor_id: String(doctor_id),
    patient_id: String(patient_id),
    value: v,
    updatedAt: new Date()
  }, { merge: true });

  return { id };
};

exports.getForDoctor = async (doctorId) => {
  const q = await col('doctor_ratings').where('doctor_id', '==', String(doctorId)).get();
  return q.docs.map(d => d.data());
};

