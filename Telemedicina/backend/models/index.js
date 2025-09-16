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
const PatientTag = require('./patientTag.model')(sequelize);
const DoctorRating = require('./doctorRating.model')(sequelize);
const Diagnosis = require('./diagnosis.model')(sequelize);
const Message = require('./message.model')(sequelize);
const SystemMessage = require('./systemMessage.model')(sequelize);

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

Patient.hasMany(PatientTag, { foreignKey: 'patient_id', as: 'tags', onDelete: 'CASCADE' });
PatientTag.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Doctor.hasMany(DoctorRating, { foreignKey: 'doctor_id', as: 'ratings', onDelete: 'CASCADE' });
DoctorRating.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

Patient.hasMany(DoctorRating, { foreignKey: 'patient_id', as: 'doctorRatings', onDelete: 'CASCADE' });
DoctorRating.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Doctor.hasMany(Diagnosis, { foreignKey: 'doctor_id', as: 'diagnoses', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Diagnosis.belongsTo(Doctor, {foreignKey: 'doctor_id', as: 'doctor'});

Patient.hasMany(Diagnosis, { foreignKey: 'patient_id', as: 'diagnoses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Diagnosis.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient'});

Appointment.hasOne(Diagnosis, { foreignKey: 'appointment_id', as: 'diagnosis', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Diagnosis.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Message.belongsTo(User, { foreignKey: 'senderUserId',   as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverUserId', as: 'receiver' });

Admin.hasMany(SystemMessage, { foreignKey: 'adminId', as: 'systemMessages', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

SystemMessage.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });

module.exports = {
  sequelize,
  User,
  Doctor,
  Patient,
  Admin,
  Appointment,
  PatientTag,
  DoctorRating,
  Diagnosis,
  Message,
  SystemMessage
};
