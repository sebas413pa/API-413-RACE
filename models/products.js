const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('products', {
    product_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    purchase_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    category_product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'category_products',
        key: 'category_product_id'
      }
    },
    brand_product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'brand_products',
        key: 'brand_product_id'
      }
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'products',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "product_id" },
        ]
      },
      {
        name: "IX_product_category",
        using: "BTREE",
        fields: [
          { name: "category_product_id" },
        ]
      },
      {
        name: "IX_product_brand",
        using: "BTREE",
        fields: [
          { name: "brand_product_id" },
        ]
      },
    ]
  });
};
