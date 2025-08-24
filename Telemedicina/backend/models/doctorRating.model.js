const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DoctorRating = sequelize.define('DoctorRating', {
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    value: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
        max: 5
      }
    }
  }, {
    tableName: 'doctor_ratings',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['doctor_id', 'patient_id'] },
      { fields: ['doctor_id'] },
      { fields: ['patient_id'] }
    ]
  });

  return DoctorRating;
};
