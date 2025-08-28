const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    senderUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sender_user_id'
    },
    receiverUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'receiver_user_id'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    sendDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'sendDate'
    },
    isReadPatient: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isRead_patient'
    },
    isReadDoctor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isRead_doctor'
    },
    isDeletedPatient: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isDeleted_patient'
    },
    isDeletedDoctor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isDeleted_doctor'
    }
  }, {
    tableName: 'messages',
    timestamps: false,
  });

  return Message;
};
