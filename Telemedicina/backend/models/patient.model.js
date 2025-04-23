const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    registDate: {
      type: DataTypes.DATEONLY
    }
  }, {
    tableName: 'patients',
    timestamps: false
  });

  return Patient;
};
