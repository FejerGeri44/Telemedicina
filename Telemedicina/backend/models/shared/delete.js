const { col } = require('./firestore');

const BATCH_LIMIT = 500;

exports.deleteWhereEquals = async (collection, field, value, db) => {
  let lastDoc = null;
  while (true) {
    let q = col(collection).where(field, '==', String(value)).limit(BATCH_LIMIT);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < BATCH_LIMIT) break;
  }
};

exports.nullifyWhereEquals = async (collection, field, value, db) => {
  let lastDoc = null;
  while (true) {
    let q = col(collection).where(field, '==', String(value)).limit(BATCH_LIMIT);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(d => batch.set(d.ref, { [field]: null }, { merge: true }));
    await batch.commit();

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < BATCH_LIMIT) break;
  }
};
