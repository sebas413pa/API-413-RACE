const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('promotion_products', {
    promotion_product_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'promotions',
        key: 'promotion_id'
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
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'promotion_products',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "promotion_product_id" },
        ]
      },
      {
        name: "promotion_id",
        using: "BTREE",
        fields: [
          { name: "promotion_id" },
        ]
      },
      {
        name: "product_id",
        using: "BTREE",
        fields: [
          { name: "product_id" },
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
