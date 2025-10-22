const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const C = 'messages';

exports.create = async (data) => {
  const id = await nextId(C);
  await doc(C, id).set({
    id,
    sender_user_id: String(data.sender_user_id),
    receiver_user_id: String(data.receiver_user_id),
    content: data.content,
    sendDate: data.sendDate ? new Date(data.sendDate) : new Date(),
    isRead_patient: !!data.isRead_patient,
    isRead_doctor: !!data.isRead_doctor,
    isDeleted_patient: !!data.isDeleted_patient,
    isDeleted_doctor: !!data.isDeleted_doctor
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

exports.listForUser = async (userId) => {
  const q1 = await col('messages').where('receiver_user_id', '==', String(userId)).get();
  const q2 = await col('messages').where('sender_user_id', '==', String(userId)).get();
  return [...q1.docs, ...q2.docs].map(d => d.data());
};

exports.delete = async (id) => {
  await doc('messages', id).delete();
};
