const { db } = require('../index');

exports.nextId = async (collectionName) => {
  const ref = db.collection('_counters').doc(collectionName);

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data().last || 0) : 0;
    const updated = current + 1;
    tx.set(ref, {last: updated}, {merge: true});
    return updated;
  });
};
