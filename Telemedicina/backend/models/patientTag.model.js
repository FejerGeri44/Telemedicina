const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PatientTag = sequelize.define('PatientTag', {
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patients', key: 'id' }
    },
    tag_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tag_value: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    tableName: 'patient_tags',
    timestamps: false
  });

  return PatientTag;
};
