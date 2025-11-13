const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('payments', {
    payment_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    sale_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sales',
        key: 'sale_id'
      }
    },
    payment_method: {
      type: DataTypes.ENUM('Tarjeta de Credito','Tarjeta de Debito','Transferencia Bancaria','Efectivo','PayPal','Otro'),
      allowNull: true,
      defaultValue: "Tarjeta de Credito"
    },
    amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('current_timestamp')
    },
    status: {
      type: DataTypes.ENUM('Pendiente','Aprobado','Rechazado','Reembolsado'),
      allowNull: true,
      defaultValue: "Pendiente"
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    card_number: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'payments',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "payment_id" },
        ]
      },
      {
        name: "IX_payments_sale_id",
        using: "BTREE",
        fields: [
          { name: "sale_id" },
        ]
      },
    ]
  });
};
