// backend/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth.routes');
const { sequelize } = require('./models');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Szerver elindult a ${PORT} porton`);

  // Kapcsolódás az adatbázishoz
  try {
    await sequelize.authenticate();
    console.log('🔗 Adatbázis kapcsolat sikeres!');
  } catch (err) {
    console.error('❌ Adatbázis kapcsolat sikertelen:', err);
  }
});
