const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');

const C = 'patient_tags';

exports.create = async ({ patient_id, tag_name, tag_value }) => {
  const id = await nextId(C);
  await doc(C, id).set({
    id,
    patient_id: String(patient_id),
    tag_name,
    tag_value
  });
  return { id };
};

exports.listForPatient = async (patientId) => {
  const q = await col('patient_tags').where('patient_id', '==', String(patientId)).get();
  return q.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.delete = async (id) => {
  await doc(C, id).delete();
};
