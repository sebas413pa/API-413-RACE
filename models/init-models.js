var DataTypes = require("sequelize").DataTypes;
var _batches = require("./batches");
var _brand_products = require("./brand_products");
var _car_brands = require("./car_brands");
var _car_categories = require("./car_categories");
var _car_images = require("./car_images");
var _car_lines = require("./car_lines");
var _cars = require("./cars");
var _category_products = require("./category_products");
var _cities = require("./cities");
var _customers = require("./customers");
var _employees = require("./employees");
var _payments = require("./payments");
var _products = require("./products");
var _promo_code_uses = require("./promo_code_uses");
var _promo_codes = require("./promo_codes");
var _promotion_products = require("./promotion_products");
var _promotions = require("./promotions");
var _purchase_details = require("./purchase_details");
var _purchases = require("./purchases");
var _quotations = require("./quotations");
var _reset_tokens = require("./reset_tokens");
var _roles = require("./roles");
var _sale_details = require("./sale_details");
var _sales = require("./sales");
var _suppliers = require("./suppliers");
var _tokens = require("./tokens");
var _users = require("./users");

function initModels(sequelize) {
  var batches = _batches(sequelize, DataTypes);
  var brand_products = _brand_products(sequelize, DataTypes);
  var car_brands = _car_brands(sequelize, DataTypes);
  var car_categories = _car_categories(sequelize, DataTypes);
  var car_images = _car_images(sequelize, DataTypes);
  var car_lines = _car_lines(sequelize, DataTypes);
  var cars = _cars(sequelize, DataTypes);
  var category_products = _category_products(sequelize, DataTypes);
  var cities = _cities(sequelize, DataTypes);
  var customers = _customers(sequelize, DataTypes);
  var employees = _employees(sequelize, DataTypes);
  var payments = _payments(sequelize, DataTypes);
  var products = _products(sequelize, DataTypes);
  var promo_code_uses = _promo_code_uses(sequelize, DataTypes);
  var promo_codes = _promo_codes(sequelize, DataTypes);
  var promotion_products = _promotion_products(sequelize, DataTypes);
  var promotions = _promotions(sequelize, DataTypes);
  var purchase_details = _purchase_details(sequelize, DataTypes);
  var purchases = _purchases(sequelize, DataTypes);
  var quotations = _quotations(sequelize, DataTypes);
  var reset_tokens = _reset_tokens(sequelize, DataTypes);
  var roles = _roles(sequelize, DataTypes);
  var sale_details = _sale_details(sequelize, DataTypes);
  var sales = _sales(sequelize, DataTypes);
  var suppliers = _suppliers(sequelize, DataTypes);
  var tokens = _tokens(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  products.belongsTo(brand_products, { as: "brand_product", foreignKey: "brand_product_id"});
  brand_products.hasMany(products, { as: "products", foreignKey: "brand_product_id"});
  car_lines.belongsTo(car_brands, { as: "brand", foreignKey: "brand_id"});
  car_brands.hasMany(car_lines, { as: "car_lines", foreignKey: "brand_id"});
  car_lines.belongsTo(car_categories, { as: "category", foreignKey: "category_id"});
  car_categories.hasMany(car_lines, { as: "car_lines", foreignKey: "category_id"});
  cars.belongsTo(car_lines, { as: "line", foreignKey: "line_id"});
  car_lines.hasMany(cars, { as: "cars", foreignKey: "line_id"});
  car_images.belongsTo(cars, { as: "car", foreignKey: "car_id"});
  cars.hasMany(car_images, { as: "car_images", foreignKey: "car_id"});
  promotion_products.belongsTo(cars, { as: "car", foreignKey: "car_id"});
  cars.hasMany(promotion_products, { as: "promotion_products", foreignKey: "car_id"});
  purchase_details.belongsTo(cars, { as: "car", foreignKey: "car_id"});
  cars.hasMany(purchase_details, { as: "purchase_details", foreignKey: "car_id"});
  quotations.belongsTo(cars, { as: "car", foreignKey: "car_id"});
  cars.hasMany(quotations, { as: "quotations", foreignKey: "car_id"});
  sale_details.belongsTo(cars, { as: "car", foreignKey: "car_id"});
  cars.hasMany(sale_details, { as: "sale_details", foreignKey: "car_id"});
  products.belongsTo(category_products, { as: "category_product", foreignKey: "category_product_id"});
  category_products.hasMany(products, { as: "products", foreignKey: "category_product_id"});
  customers.belongsTo(cities, { as: "city", foreignKey: "city_id"});
  cities.hasMany(customers, { as: "customers", foreignKey: "city_id"});
  promo_code_uses.belongsTo(customers, { as: "customer", foreignKey: "customer_id"});
  customers.hasMany(promo_code_uses, { as: "promo_code_uses", foreignKey: "customer_id"});
  promo_codes.belongsTo(customers, { as: "customer", foreignKey: "customer_id"});
  customers.hasMany(promo_codes, { as: "promo_codes", foreignKey: "customer_id"});
  quotations.belongsTo(customers, { as: "customer", foreignKey: "customer_id"});
  customers.hasMany(quotations, { as: "quotations", foreignKey: "customer_id"});
  sales.belongsTo(customers, { as: "customer", foreignKey: "customer_id"});
  customers.hasMany(sales, { as: "sales", foreignKey: "customer_id"});
  purchases.belongsTo(employees, { as: "employee", foreignKey: "employee_id"});
  employees.hasMany(purchases, { as: "purchases", foreignKey: "employee_id"});
  sales.belongsTo(employees, { as: "employee", foreignKey: "employee_id"});
  employees.hasMany(sales, { as: "sales", foreignKey: "employee_id"});
  batches.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(batches, { as: "batches", foreignKey: "product_id"});
  promotion_products.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(promotion_products, { as: "promotion_products", foreignKey: "product_id"});
  purchase_details.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(purchase_details, { as: "purchase_details", foreignKey: "product_id"});
  sale_details.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(sale_details, { as: "sale_details", foreignKey: "product_id"});
  promo_code_uses.belongsTo(promo_codes, { as: "promo_code", foreignKey: "promo_code_id"});
  promo_codes.hasMany(promo_code_uses, { as: "promo_code_uses", foreignKey: "promo_code_id"});
  promotion_products.belongsTo(promotions, { as: "promotion", foreignKey: "promotion_id"});
  promotions.hasMany(promotion_products, { as: "promotion_products", foreignKey: "promotion_id"});
  batches.belongsTo(purchases, { as: "purchase", foreignKey: "purchase_id"});
  purchases.hasMany(batches, { as: "batches", foreignKey: "purchase_id"});
  purchase_details.belongsTo(purchases, { as: "purchase", foreignKey: "purchase_id"});
  purchases.hasMany(purchase_details, { as: "purchase_details", foreignKey: "purchase_id"});
  sales.belongsTo(quotations, { as: "quotation", foreignKey: "quotation_id"});
  quotations.hasMany(sales, { as: "sales", foreignKey: "quotation_id"});
  users.belongsTo(roles, { as: "role", foreignKey: "role_id"});
  roles.hasMany(users, { as: "users", foreignKey: "role_id"});
  payments.belongsTo(sales, { as: "sale", foreignKey: "sale_id"});
  sales.hasMany(payments, { as: "payments", foreignKey: "sale_id"});
  promo_code_uses.belongsTo(sales, { as: "sale", foreignKey: "sale_id"});
  sales.hasMany(promo_code_uses, { as: "promo_code_uses", foreignKey: "sale_id"});
  sale_details.belongsTo(sales, { as: "sale", foreignKey: "sale_id"});
  sales.hasMany(sale_details, { as: "sale_details", foreignKey: "sale_id"});
  batches.belongsTo(suppliers, { as: "supplier", foreignKey: "supplier_id"});
  suppliers.hasMany(batches, { as: "batches", foreignKey: "supplier_id"});
  purchases.belongsTo(suppliers, { as: "supplier", foreignKey: "supplier_id"});
  suppliers.hasMany(purchases, { as: "purchases", foreignKey: "supplier_id"});
  customers.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasOne(customers, { as: "customer", foreignKey: "user_id"});
  employees.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasOne(employees, { as: "employee", foreignKey: "user_id"});
  reset_tokens.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(reset_tokens, { as: "reset_tokens", foreignKey: "user_id"});
  tokens.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(tokens, { as: "tokens", foreignKey: "user_id"});

  return {
    batches,
    brand_products,
    car_brands,
    car_categories,
    car_images,
    car_lines,
    cars,
    category_products,
    cities,
    customers,
    employees,
    payments,
    products,
    promo_code_uses,
    promo_codes,
    promotion_products,
    promotions,
    purchase_details,
    purchases,
    quotations,
    reset_tokens,
    roles,
    sale_details,
    sales,
    suppliers,
    tokens,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
