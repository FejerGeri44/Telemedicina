const { col, doc } = require('./shared/firestore');
const { nextId } = require('./shared/counter');
const C = 'users';
const { db } = require('../models');
const { deleteWhereEquals } = require('./shared/delete');
const patientModel = require('./patient.model');
const doctorModel  = require('./doctor.model');
const adminModel   = require('./admin.model');

exports.create = async (data) => {
  const id = await nextId(C);
  const ref = doc(C, id);
  await ref.set({
    id,
    email: String(data.email).toLowerCase(),
    name: data.name,
    role: data.role,
    phoneNumber: data.phoneNumber,
    address: data.address,
    pictureUrl: data.pictureUrl,
    authUid: data.authUid,
    createdAt: new Date()
  });
  return { id };
};

exports.findByAuthUid = async (authUid) => {
  if (!authUid) return null;

  const snap = await db
    .collection('users')
    .where('authUid', '==', authUid)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  return {
    id: data.id ?? doc.id,
    docId: doc.id,
    ...data,
  };
};

exports.update = async (id, patch) => {
  await doc(C, id).set(patch, { merge: true });
};

exports.findByEmail = async (email) => {
  const q = await col(C).where('email', '==', String(email).toLowerCase()).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
};

exports.delete = async (id) => {
  const user = await this.get(id);
  if (!user) return;

  const patient = await patientModel.findByUserId(id);
  const doctor  = await doctorModel.getByUserId(id);
  const admin   = await adminModel.getByUserId(id);
  if (patient) await patientModel.delete(patient.id);
  if (doctor)  await doctorModel.delete(doctor.id);
  if (admin)   await adminModel.delete(admin.id);

  await deleteWhereEquals('messages', 'sender_user_id',   id, db);
  await deleteWhereEquals('messages', 'receiver_user_id', id, db);

  await doc('users', id).delete();
};
