const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sales', {
    sale_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'customer_id'
      }
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'employee_id'
      }
    },
    sale_date: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    total: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    sale_type: {
      type: DataTypes.ENUM('Producto','Vehiculo'),
      allowNull: true,
      defaultValue: "Producto"
    },
    quotation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'quotations',
        key: 'quotation_id'
      }
    },
    status: {
      type: DataTypes.ENUM('Pendiente','Enviada','Completada','Cancelada'),
      allowNull: true,
      defaultValue: "Pendiente"
    }
  }, {
    sequelize,
    tableName: 'sales',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "sale_id" },
        ]
      },
      {
        name: "employee_id",
        using: "BTREE",
        fields: [
          { name: "employee_id" },
        ]
      },
      {
        name: "quotation_id",
        using: "BTREE",
        fields: [
          { name: "quotation_id" },
        ]
      },
      {
        name: "IX_sales_customer_id",
        using: "BTREE",
        fields: [
          { name: "customer_id" },
        ]
      },
    ]
  });
};
