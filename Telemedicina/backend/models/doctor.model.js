const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Doctor = sequelize.define('Doctor', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    speciality: {
      type: DataTypes.STRING,
      allowNull: false
    },
    introduction: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avgRating: {
      type: DataTypes.DECIMAL(3,2),
      allowNull: true,
      defaultValue: null
    },
    registDate: {
      type: DataTypes.DATEONLY
    }
  }, {
    tableName: 'doctors',
    timestamps: false
  });

  return Doctor;
};
