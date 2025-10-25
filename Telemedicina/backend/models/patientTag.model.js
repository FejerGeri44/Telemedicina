const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const { db } = require('../models');
const C = 'patient_tags';

exports.create = async ({ patient_id, tag_name, tag_value }) => {
  const id = await nextId(C);
  await doc(C, id).set({
    id,
    patient_id,
    tag_name,
    tag_value
  });
  return { id };
};

exports.getPatientTagsByUserId = async (userId) => {
  const snap = await db.collection('patientTags')
    .where('patient_id', '==', userId)
    .get();

  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: data.id ?? d.id,
      name: (data.tag_name ?? '').trim(),
      value: (data.tag_value ?? '').trim(),
    };
  });
}

exports.listForPatient = async (patientId) => {
  const q = await col('patient_tags').where('patient_id', '==', String(patientId)).get();
  return q.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.delete = async (id) => {
  await doc(C, id).delete();
};
