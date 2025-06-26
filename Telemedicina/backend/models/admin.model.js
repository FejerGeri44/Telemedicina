const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Admin = sequelize.define('Admin', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    registDate: {
    type: DataTypes.DATEONLY
  }
  }, {
    tableName: 'admins',
    timestamps: false
  });

  return Admin;
};
