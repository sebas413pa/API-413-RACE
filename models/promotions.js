const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('promotions', {
    promotion_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    promotion_name: {
      type: DataTypes.STRING(255),
      allowNull: false
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
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'promotions',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "promotion_id" },
        ]
      },
    ]
  });
};
