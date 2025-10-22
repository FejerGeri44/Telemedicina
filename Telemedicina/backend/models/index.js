const { admin, db, bucket } = require('../config/firebase-config');

const auth = admin.auth();
const col = (name) => db.collection(name);
const doc = (collectionName, id) => db.collection(collectionName).doc(String(id));

module.exports = {
  admin,
  auth,
  db,
  bucket,
  col,
  doc,
};
