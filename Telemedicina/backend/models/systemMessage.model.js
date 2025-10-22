const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');

const C = 'system_messages';

exports.create = async (data) => {
  const id = await nextId(C);
  await doc(C, id).set({
    id,
    adminId: String(data.adminId),
    title: data.title,
    message: data.message,
    type: data.type ?? 'info',
    audience: data.audience ?? 'all',
    createdAt: new Date(),
    validUntil: data.validUntil ? new Date(data.validUntil) : null
  });
  return { id };
};

exports.get = async (id) => {
  const s = await doc(C, id).get();
  return s.exists ? ({ id: s.id, ...s.data() }) : null;
};

exports.update = async (id, patch) => {
  await doc(C, id).set(patch, { merge: true });
};

exports.listForAdmin = async (adminId) => {
  const q = await col('system_messages').where('adminId', '==', String(adminId)).get();
  return q.docs.map(d => d.data());
};

exports.delete = async (id) => {
  await doc('system_messages', id).delete();
};
