const { col, doc } = require('./shared/firestore');
const { db } = require('../models');
const { nextId } = require('./shared/counter');
const C = 'appointments';
const { nullifyWhereEquals } = require('./shared/delete');

exports.create = async ({ doctor_id, patient_id = null, from, to, status = 'free' }) => {
  const newId = await nextId(C);
  const docId = String(newId);

  await db.collection(C).doc(docId).set({
    id: newId,
    doctor_id: String(doctor_id),
    patient_id: patient_id ? String(patient_id) : null,
    from: new Date(from),
    to:   new Date(to),
    status
  });

  return { id: newId };
};

exports.listForDoctor = async (doctorId) => {
  const q = await col('appointments').where('doctor_id', '==', String(doctorId)).get();
  return q.docs.map(d => d.data());
};

exports.listForPatient = async (patientId) => {
  const q = await col('appointments').where('patient_id', '==', String(patientId)).get();
  return q.docs.map(d => d.data());
};

exports.update = async (id, patch) => {
  await doc(C, id).set(patch, { merge: true });
};

exports.listForDoctorFrom = async (doctorId, fromDate) => {
  const q = await col(C)
    .where('doctor_id', '==', String(doctorId))
    .where('from', '>=', new Date(fromDate))
    .get();
  return q.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.delete = async (id) => {
  await nullifyWhereEquals('diagnoses', 'appointment_id', id, db);
  await doc('appointments', id).delete();
};
