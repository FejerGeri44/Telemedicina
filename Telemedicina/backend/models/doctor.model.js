const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const { db } = require('../models');
const { deleteWhereEquals } = require('./shared/delete');

exports.create = async (data) => {
  const id = await nextId('doctors');
  await doc('doctors', id).set({
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
  const query = await col('doctors').where('userId', '==', String(userId)).limit(1).get();
  return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() };
};

exports.update = async (id, patch) => {
  await doc('doctors', id).set(patch, { merge: true });
};

exports.listApproved = async () => {
  const query = await col('doctors').where('status', '==', 'approved').get();
  return query.docs.map(document => ({ id: document.id, ...document.data() }));
};

exports.delete = async (id) => {
  await deleteWhereEquals('appointments',   'doctor_id', id, db);
  await deleteWhereEquals('diagnoses',      'doctor_id', id, db);
  await deleteWhereEquals('doctor_ratings', 'doctor_id', id, db);
  await deleteWhereEquals('messages',       'sender_user_id',   id, db);
  await deleteWhereEquals('messages',       'receiver_user_id', id, db);

  await doc('doctors', id).delete();
};
