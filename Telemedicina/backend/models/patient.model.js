const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const { db } = require('../models');
const { deleteWhereEquals } = require('./shared/delete');

exports.create = async (data) => {
  const id = await nextId('patients');
  await doc('patients', id).set({
    id,
    userId: String(data.userId),
    gender: data.gender ?? null,
    height: data.height != null ? Number(data.height) : null,
    weight: data.weight != null ? Number(data.weight) : null,
    taj: data.taj ?? null,
    homePhone: data.homePhone ?? null,
    birthDate: data.birthDate,
    registDate: data.registDate ?? new Date()
  });
  return { id };
};

exports.getByUserId = async (userId) => {
  const query = await col('patients').where('userId', '==', String(userId)).limit(1).get();
  return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() };
};

exports.update = async (id, patch) => {
  await doc('patients', id).set(patch, { merge: true });
};

exports.findByUserId = async (userId) => {
  const query = await col('patients').where('userId', '==', String(userId)).limit(1).get();
  return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() };
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
