const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT,
  port: dbConfig.PORT,
  logging: false,
  timezone: '+02:00'
});

// Modellek betöltése
const User = require('./user.model')(sequelize);
const Doctor = require('./doctor.model')(sequelize);
const Patient = require('./patient.model')(sequelize);
const Admin = require('./admin.model')(sequelize);
const Appointment = require('./appointment.model')(sequelize);

// Kapcsolatok
User.hasOne(Doctor, { foreignKey: 'userId' });
Doctor.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Patient, { foreignKey: 'userId' });
Patient.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Admin, { foreignKey: 'userId' });
Admin.belongsTo(User, { foreignKey: 'userId' });

Doctor.hasMany(Appointment, { foreignKey: 'doctor_id' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id' });

Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });

module.exports = {
  sequelize,
  User,
  Doctor,
  Patient,
  Admin,
  Appointment
};
