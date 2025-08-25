const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Diagnosis = sequelize.define('Diagnosis', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'appointment_id',
      references: { model: 'appointments', key: 'id' }
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'patient_id',
      references: { model: 'patients', key: 'id' }
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'doctor_id',
      references: { model: 'doctors', key: 'id' }
    },

    // Symptoms
    chiefComplaint: { type: DataTypes.STRING, allowNull: false },
    onsetDate: { type: DataTypes.DATEONLY, allowNull: true },
    history: { type: DataTypes.TEXT, allowNull: true },

    // Exam
    bpSys: { type: DataTypes.INTEGER, allowNull: true },
    bpDia: { type: DataTypes.INTEGER, allowNull: true },
    heartRate: { type: DataTypes.INTEGER, allowNull: true },
    tempC: { type: DataTypes.DECIMAL(4,1), allowNull: true },
    spo2: { type: DataTypes.INTEGER, allowNull: true },
    weightKg: { type: DataTypes.DECIMAL(5,1), allowNull: true },
    heightCm: { type: DataTypes.DECIMAL(5,1), allowNull: true },
    bmi: { type: DataTypes.DECIMAL(4,1), allowNull: true },
    examSummary: { type: DataTypes.TEXT, allowNull: true },

    // Diagnosis
    primaryText: { type: DataTypes.STRING, allowNull: false },
    codeSystem: { type: DataTypes.STRING, allowNull: true },
    code: { type: DataTypes.STRING, allowNull: true },
    certaintyPct: { type: DataTypes.INTEGER, allowNull: true },
    severity: { type: DataTypes.STRING, allowNull: true },
    differentials: { type: DataTypes.TEXT, allowNull: true },

    // Plan
    assessment: { type: DataTypes.TEXT, allowNull: true },
    planText: { type: DataTypes.TEXT, allowNull: true },
    redFlags: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    informed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    tableName: 'diagnoses',
    timestamps: false,
  });

  return Diagnosis;
};
