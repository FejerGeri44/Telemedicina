const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');

const { admin, db } = require('./models');

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const doctorRoutes = require('./routes/doctor.routes');
const adminRoutes = require('./routes/admin.routes');
const sharedRoutes = require('./routes/shared.routes');
const aiRoutes = require('./routes/aiConfig.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', patientRoutes);
app.use('/api', doctorRoutes);
app.use('/api', adminRoutes);
app.use('/api', sharedRoutes);
app.use('/api', aiRoutes);

const PORT =  3000;

app.listen(PORT, async () => {
  console.log(`🚀 Szerver elindult a ${PORT} porton`);

  try {
    const snap = await db.collection('__healthcheck').limit(1).get();
    console.log('🔗 Firestore kapcsolat aktív. Doksi szám:', snap.size);
  } catch (err) {
    console.error('❌ Firestore kapcsolat sikertelen:', err);
  }
});
