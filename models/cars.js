const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('cars', {
    car_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    line_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'car_lines',
        key: 'line_id'
      }
    },
    color: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    engine_capacity: {
      type: DataTypes.DECIMAL(6,2),
      allowNull: false
    },
    type_car: {
      type: DataTypes.ENUM('Electrico','Gasolina','Hibrido'),
      allowNull: true,
      defaultValue: "Gasolina"
    },
    transmission: {
      type: DataTypes.ENUM('Manual','Automatica'),
      allowNull: true
    },
    model: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'cars',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "car_id" },
        ]
      },
      {
        name: "IX_cars_line_id",
        using: "BTREE",
        fields: [
          { name: "line_id" },
        ]
      },
    ]
  });
};
