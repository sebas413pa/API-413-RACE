const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('quotations', {
    quotation_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'customer_id'
      }
    },
    car_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cars',
        key: 'car_id'
      }
    },
    status: {
      type: DataTypes.ENUM('Pendiente','Aprobada','Rechazada','Completada'),
      allowNull: true,
      defaultValue: "Pendiente"
    },
    total: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'quotations',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "quotation_id" },
        ]
      },
      {
        name: "customer_id",
        using: "BTREE",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "car_id",
        using: "BTREE",
        fields: [
          { name: "car_id" },
        ]
      },
    ]
  });
};
