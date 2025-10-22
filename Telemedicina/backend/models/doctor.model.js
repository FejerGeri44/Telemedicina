const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const C = 'doctors';
const { db } = require('../models');
const { deleteWhereEquals } = require('./shared/delete');

exports.create = async (data) => {
  const id = await nextId(C);
  await doc(C, id).set({
    id,
    userId: String(data.userId),
    speciality: data.speciality ?? null,
    introduction: data.introduction ?? null,
    avgRating: data.avgRating ?? 0,
    registDate: data.registDate ?? new Date(),
    status: data.status ?? 'pending',
  });
  return { id };
};

exports.getByUserId = async (userId) => {
  const q = await col('doctors').where('userId', '==', String(userId)).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
};

exports.update = async (id, patch) => {
  await doc(C, id).set(patch, { merge: true });
};

exports.listApproved = async () => {
  const q = await col(C).where('status', '==', 'approved').get();
  return q.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.delete = async (id) => {
  await deleteWhereEquals('appointments',   'doctor_id', id, db);
  await deleteWhereEquals('diagnoses',      'doctor_id', id, db);
  await deleteWhereEquals('doctor_ratings', 'doctor_id', id, db);
  await deleteWhereEquals('messages',       'sender_user_id',   id, db);
  await deleteWhereEquals('messages',       'receiver_user_id', id, db);

  await doc('doctors', id).delete();
};
