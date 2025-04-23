const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT,
  port: dbConfig.PORT,
  logging: false
});

// Modellek betöltése
const User = require('./user.model')(sequelize);
const Doctor = require('./doctor.model')(sequelize);
const Patient = require('./patient.model')(sequelize);
const Admin = require('./admin.model')(sequelize);

// Kapcsolatok
User.hasOne(Doctor, { foreignKey: 'email' });
Doctor.belongsTo(User, { foreignKey: 'email' });

User.hasOne(Patient, { foreignKey: 'email' });
Patient.belongsTo(User, { foreignKey: 'email' });

User.hasOne(Admin, { foreignKey: 'email' });
Admin.belongsTo(User, { foreignKey: 'email' });

module.exports = {
  sequelize,
  User,
  Doctor,
  Patient,
  Admin
};
