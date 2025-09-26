const LATEST_PATH = 'chatbots/patient-assistant/patient-assistant.json';
const admin = require('firebase-admin');
const serviceAccount = require('../config/serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'szakdolgozat-8655.firebasestorage.app',
});

exports.getPatientAssistantConfig = async (req, res) => {
  try {
    const bucket = admin.storage().bucket();
    const [exists] = await bucket.file(LATEST_PATH).exists();
    if (!exists) {
      return res.status(404).json({ message: 'A konfigurációs fájl nem található a Storage-ban.' });
    }

    const [buffer] = await bucket.file(LATEST_PATH).download();
    const json = JSON.parse(buffer.toString('utf-8'));
    return res.status(200).json(json);
  } catch (err) {
    console.error('getPatientAssistantConfig hiba:', err);
    return res.status(500).json({ message: 'Nem sikerült lekérni a konfigurációt.' });
  }
};
