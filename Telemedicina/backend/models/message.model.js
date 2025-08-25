const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    senderUserId:   {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sender_user_id'
    },
    receiverUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'receiver_user_id'
    },

    content:  {
      type: DataTypes.TEXT,
      allowNull: false
    },
    sendDate: {
      type: DataTypes.DATE, allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    isRead:   {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'messages',
    timestamps: false
  });

  return Message;
};
