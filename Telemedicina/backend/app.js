require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://telemedicina-carelink.vercel.app',
    'http://127.0.0.1:5000'
],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(cookieParser());

app.use('/auth', require('./routes/auth.routes'));
app.use('/patient', require('./routes/patient.routes'));
app.use('/doctor', require('./routes/doctor.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/messages', require('./routes/messages.routes'));

const PORT = process.env.PORT;

app.listen(PORT, async () => {
  console.log(`🚀 Szerver elindult a ${PORT} porton`);

  try {
    console.log('🔗 Supabase Postgres kapcsolat él.');
  } catch (err) {
    console.error('❌ DB kapcsolat sikertelen:', err);
  }
});
