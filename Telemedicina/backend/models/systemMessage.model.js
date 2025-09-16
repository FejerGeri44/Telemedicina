const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemMessage = sequelize.define('SystemMessage', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('info', 'warning', 'error', 'success'),
      allowNull: false,
      defaultValue: 'info'
    },
    audience: {
      type: DataTypes.ENUM('all', 'patient', 'doctor', 'admin'),
      allowNull: false,
      defaultValue: 'all'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'system_messages',
    timestamps: false
  });

  return SystemMessage;
};
