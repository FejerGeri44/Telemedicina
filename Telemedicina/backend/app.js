const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/patient', require('./routes/patient.routes'));
app.use('/api/doctor', require('./routes/doctor.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/shared', require('./routes/shared.routes'));
app.use('/api/aiConfig', require('./routes/aiConfig.routes'));

const PORT =  process.env.PORT;

app.listen(PORT, async () => {
  console.log(`🚀 Szerver elindult a ${PORT} porton`);

  try {
    console.log('🔗 Firestore kapcsolat aktív.');
  } catch (err) {
    console.error('❌ Firestore kapcsolat sikertelen:', err);
  }
});
