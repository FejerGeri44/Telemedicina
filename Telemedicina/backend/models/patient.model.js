const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const C = 'patients';
const { db } = require('../models');
const { deleteWhereEquals } = require('./shared/delete');

exports.create = async (data) => {
  const id = await nextId(C);
  await doc(C, id).set({
    id,
    userId: String(data.userId),
    gender: data.gender ?? null,
    height: data.height != null ? Number(data.height) : null,
    weight: data.weight != null ? Number(data.weight) : null,
    taj: data.taj ?? null,
    homePhone: data.homePhone ?? null,
    registDate: data.registDate ?? new Date()
  });
  return { id };
};

exports.getByUserId = async (userId) => {
  const q = await col('patients').where('userId', '==', String(userId)).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
};

exports.update = async (id, patch) => {
  await doc(C, id).set(patch, { merge: true });
};

exports.findByUserId = async (userId) => {
  const q = await col(C).where('userId', '==', String(userId)).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
};

exports.delete = async (id) => {
  await deleteWhereEquals('patient_tags',   'patient_id', id, db);
  await deleteWhereEquals('diagnoses',      'patient_id', id, db);
  await deleteWhereEquals('doctor_ratings', 'patient_id', id, db);
  await deleteWhereEquals('appointments',   'patient_id', id, db);
  await deleteWhereEquals('messages',       'sender_user_id',   id, db);
  await deleteWhereEquals('messages',       'receiver_user_id', id, db);

  await doc('patients', id).delete();
};
