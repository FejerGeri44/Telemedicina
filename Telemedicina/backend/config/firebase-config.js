const admin = require('firebase-admin');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const serviceAccount = require('./serviceAccount.json');

const bucketName = 'szakdolgozat-8655.appspot.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: bucketName,
});

const db = new Firestore({
  projectId: serviceAccount.project_id,
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
  databaseId: 'telemedicina',
});

const bucket = admin.storage().bucket(bucketName);

module.exports = { admin, db, bucket, FieldValue };
