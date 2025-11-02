const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('promo_codes', {
    promo_code_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    promo_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "promo_code"
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'customer_id'
      }
    },
    discount_type: {
      type: DataTypes.ENUM('percentage','fixed_amount'),
      allowNull: true,
      defaultValue: "percentage"
    },
    discount_value: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    min_purchase_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    max_discount_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'promo_codes',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "promo_code_id" },
        ]
      },
      {
        name: "promo_code",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "promo_code" },
        ]
      },
      {
        name: "customer_id",
        using: "BTREE",
        fields: [
          { name: "customer_id" },
        ]
      },
    ]
  });
};
