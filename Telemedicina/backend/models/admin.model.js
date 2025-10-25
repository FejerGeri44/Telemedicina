const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const { db } = require('../models');
const { deleteWhereEquals } = require('./shared/delete');

exports.create = async (data) => {
  const id = await nextId('admins');
  await doc('admins', id).set({
    id,
    userId: String(data.userId),
    registDate: data.registDate ?? new Date(),
  });
  return { id };
};

exports.getByUserId = async (userId) => {
  const query = await col('admins').where('userId', '==', String(userId)).limit(1).get();
  return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() };
};

exports.update = async (id, patch) => {
  await doc('admins', id).set(patch, { merge: true });
};

exports.delete = async (id) => {
  await deleteWhereEquals('system_messages', 'adminId', id, db);
  await doc('admins', id).delete();
};
