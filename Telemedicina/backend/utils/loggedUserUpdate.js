function normalizeField(val) {
  if (typeof val === 'string') {
    const v = val.trim();
    return v === '' ? undefined : v;
  }
  return val;
}

async function buildLoggedUser(db, userId) {
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error('User not found when building LoggedUser');

  const user = { id: userId, ...userSnap.data() };

  const patient = await db.collection('patients').doc(userId).get();
  if (patient.exists) {
    const tagsSnap = await db
      .collection('patientTags')
      .where('patient_id', '==', Number(userId))
      .get();

    const tags = tagsSnap.docs.map(d => {
      const data = d.data() || {};
      return {
        name: (data.tag_name ?? '').trim(),
        value: (data.tag_value ?? '').trim(),
      };
    });

    const related = { id: patient.id, ...patient.data(), tags };
    return { user, related };
  }

  const doctor = await findByUserId(db, 'doctors', userId);
  if (doctor) {
    const related = { ...doctor };
    return { user, related };
  }

  const admin = await findByUserId(db, 'admins', userId);
  if (admin) {
    const related = { ...admin };
    return { user, related };
  }

  return { user, related: null };
}

async function findByUserId(db, collectionName, userIdStr) {
  const q = await db.collection(collectionName)
    .where('userId', '==', userIdStr)
    .limit(1)
    .get();
  if (!q.empty) {
    const doc = q.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const docSnap = await db.collection(collectionName).doc(userIdStr).get();
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() };
  }

  return null;
}

module.exports = {
  normalizeField,
  buildLoggedUser
};
