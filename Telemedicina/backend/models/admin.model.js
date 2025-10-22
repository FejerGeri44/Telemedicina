const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const C = 'admins';
const { db } = require('../models');
const { deleteWhereEquals } = require('./shared/delete');

exports.create = async ({ userId, registDate = new Date() }) => {
  const id = await nextId(C);
  await doc(C, id).set({ id, userId: String(userId), registDate });
  return { id };
};

exports.getByUserId = async (userId) => {
  const q = await col('admins').where('userId', '==', String(userId)).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
};

exports.update = async (id, patch) => {
  await doc(C, id).set(patch, { merge: true });
};

exports.delete = async (id) => {
  await deleteWhereEquals('system_messages', 'adminId', id, db);
  await doc('admins', id).delete();
};
