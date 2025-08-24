const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    gender: { type: DataTypes.ENUM('Férfi', 'Nő'), allowNull: false },
    height: { type: DataTypes.FLOAT, allowNull: true },
    weight: { type: DataTypes.FLOAT, allowNull: true },
    taj: { type: DataTypes.STRING,  allowNull: false, unique: true },
    homePhone: { type: DataTypes.STRING, allowNull: true},
    registDate: { type: DataTypes.DATEONLY }
  }, {
    tableName: 'patients',
    timestamps: false
  });

  return Patient;
};
