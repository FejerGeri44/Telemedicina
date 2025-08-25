const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define("Appointment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    from: {
      type: DataTypes.DATE,
      allowNull: false
    },
    to: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('free', 'accepted', 'done'),
      defaultValue: 'free'
    }
  }, {
    timestamps: false
  });

  return Appointment;
};

