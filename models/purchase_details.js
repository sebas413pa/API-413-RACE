const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('purchase_details', {
    purchase_detail_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    purchase_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'purchases',
        key: 'purchase_id'
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'products',
        key: 'product_id'
      }
    },
    car_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cars',
        key: 'car_id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    unit_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    subtotal: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'purchase_details',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "purchase_detail_id" },
        ]
      },
      {
        name: "purchase_id",
        using: "BTREE",
        fields: [
          { name: "purchase_id" },
        ]
      },
      {
        name: "IX_purchase_details_product_id",
        using: "BTREE",
        fields: [
          { name: "product_id" },
        ]
      },
      {
        name: "IX_purchase_details_car_id",
        using: "BTREE",
        fields: [
          { name: "car_id" },
        ]
      },
    ]
  });
};
