/*
Created: 20/10/2025
Modified: 20/10/2025
Model: MySQL 8.0
Database: MySQL 8.0
*/

CREATE DATABASE IF NOT EXISTS `413_race`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `413_race`;

-- 1. ROLES
CREATE TABLE roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  google_id VARCHAR(100) UNIQUE NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IX_users_role_id ON users(role_id);

-- 3. EMPLOYEES
CREATE TABLE employees (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  hire_date DATE,
  salary DECIMAL(10,2),
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 4. CITIES
CREATE TABLE cities (
  city_id INT AUTO_INCREMENT PRIMARY KEY,
  city_name VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. CUSTOMERS
CREATE TABLE customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birthday DATE NOT NULL,
  gender ENUM('Masculino','Femenino','Otro') DEFAULT 'Otro',
  phone VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (city_id) REFERENCES cities(city_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 6. CAR CATEGORIES
CREATE TABLE car_categories (
  car_category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. CAR BRANDS
CREATE TABLE car_brands (
  brand_id INT AUTO_INCREMENT PRIMARY KEY,
  brand_name VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 8. CAR LINES
CREATE TABLE car_lines (
  line_id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  category_id INT NOT NULL,
  line_name VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES car_brands(brand_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (category_id) REFERENCES car_categories(car_category_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IX_car_lines_brand_id ON car_lines(brand_id);
CREATE INDEX IX_car_lines_category_id ON car_lines(category_id);

-- 9. CARS
CREATE TABLE cars (
  car_id INT AUTO_INCREMENT PRIMARY KEY,
  line_id INT NOT NULL,
  color VARCHAR(100) NOT NULL,
  engine_capacity DECIMAL(6,2) NOT NULL, 
  type_car ENUM('Electrico','Gasolina','Hibrido') DEFAULT 'Gasolina',
  transmission ENUM('Manual','Automatica'),
  model INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0 NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (line_id) REFERENCES car_lines(line_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (stock >= 0),
  CHECK (price >= 0)
);
CREATE INDEX IX_cars_line_id ON cars(line_id);

-- 10. CAR IMAGES
CREATE TABLE car_images (
  car_image_id INT AUTO_INCREMENT PRIMARY KEY,
  car_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(car_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IX_car_images_car_id ON car_images(car_id);

-- 11. CATEGORY_PRODUCTS
CREATE TABLE category_products (
  category_product_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 12. BRAND_PRODUCT
CREATE TABLE brand_products (
  brand_product_id INT AUTO_INCREMENT PRIMARY KEY,
  brand_name VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 13. PRODUCTS
CREATE TABLE products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  image_url VARCHAR(255),
  stock INT DEFAULT 0 CHECK (stock >= 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  purchase_price DECIMAL(10,2),
  category_product_id INT NOT NULL,
  brand_product_id INT NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_product_id) REFERENCES category_products(category_product_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (brand_product_id) REFERENCES brand_products(brand_product_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IX_product_category ON products(category_product_id);
CREATE INDEX IX_product_brand ON products(brand_product_id);

-- 14. SUPPLIERS
CREATE TABLE suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  address VARCHAR(255),
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 15. PURCHASES
CREATE TABLE purchases (
  purchase_id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  employee_id INT,
  total DECIMAL(10,2),
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (total >= 0)
);
CREATE INDEX IX_purchases_supplier_id ON purchases(supplier_id);

-- 16. PURCHASE_DETAILS
CREATE TABLE purchase_details (
  purchase_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  product_id INT,
  car_id INT,
  quantity INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (car_id) REFERENCES cars(car_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (quantity >= 0),
  CHECK (unit_price >= 0)
);
CREATE INDEX IX_purchase_details_product_id ON purchase_details(product_id);
CREATE INDEX IX_purchase_details_car_id ON purchase_details(car_id);

-- 17. BATCHES (lotes)
CREATE TABLE batches (
  batch_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  supplier_id INT,
  purchase_id INT,
  batch_code VARCHAR(100),
  quantity INT NOT NULL DEFAULT 0,
  available_qty INT NOT NULL DEFAULT 0,
  received_at DATE,
  expires_at DATE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (quantity >= 0),
  CHECK (available_qty >= 0)
);
CREATE INDEX IX_batches_product_id ON batches(product_id);
CREATE INDEX IX_batches_supplier_id ON batches(supplier_id);

-- 18. QUOTATIONS
CREATE TABLE quotations (
  quotation_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  car_id INT NOT NULL,
  status ENUM('Pendiente','Aprobada','Rechazada','Completada') DEFAULT 'Pendiente',
  total DECIMAL(10,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (car_id) REFERENCES cars(car_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 19. SALES
CREATE TABLE sales (
  sale_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  employee_id INT,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2),
  sale_type ENUM('Producto','Vehiculo') DEFAULT 'Producto',
  quotation_id INT,
  status ENUM('Pendiente', 'Enviada', 'Completada', 'Cancelada') DEFAULT 'Pendiente',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (quotation_id) REFERENCES quotations(quotation_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IX_sales_customer_id ON sales(customer_id);

-- 20. SALE_DETAILS
CREATE TABLE sale_details (
  sale_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT,
  car_id INT,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (car_id) REFERENCES cars(car_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (quantity >= 0)
);
CREATE INDEX IX_sale_details_sale_id ON sale_details(sale_id);
CREATE INDEX IX_sale_details_product_id ON sale_details(product_id);
CREATE INDEX IX_sale_details_car_id ON sale_details(car_id);

-- 22. PAYMENTS

CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  payment_method ENUM('Tarjeta de Credito', 'Tarjeta de Debito', 'Transferencia Bancaria', 'Efectivo', 'PayPal', 'Otro') DEFAULT 'Tarjeta de Credito',
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Pendiente', 'Aprobado', 'Rechazado', 'Reembolsado') DEFAULT 'Pendiente',
  transaction_id VARCHAR(100),  -- Para IDs de gateways como Stripe o PayPal
  notes TEXT,  -- Notas opcionales, ej. errores o detalles
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE ON UPDATE CASCADE  -- Elimina pagos si se elimina la venta
);

CREATE INDEX IX_payments_sale_id ON payments(sale_id);  -- Índice para consultas rápidas por venta

-- 21. TOKENS
CREATE TABLE tokens (
  token_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IX_tokens_user_id ON tokens(user_id);


-- 23. PROMOTIONS
CREATE TABLE promotions (
  promotion_id INT AUTO_INCREMENT PRIMARY KEY,
  promotion_name VARCHAR(255) NOT NULL,
  discount_type ENUM('percentage', 'fixed_amount') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 24.PROMOTION PRODUCTS
CREATE TABLE promotion_products (
  promotion_product_id INT AUTO_INCREMENT PRIMARY KEY,
  promotion_id INT NOT NULL,
  product_id INT NULL,
  car_id INT NULL,
  FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (car_id) REFERENCES cars(car_id),
  CHECK (product_id IS NOT NULL OR car_id IS NOT NULL),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 25. PROMO_CODES
CREATE TABLE promo_codes (
  promo_code_id INT AUTO_INCREMENT PRIMARY KEY,
  promo_code VARCHAR(50) UNIQUE NOT NULL,
  promotion_id INT NOT NULL,
  customer_id INT NOT NULL,
  discount_type ENUM('percentage', 'fixed_amount') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2) DEFAULT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- 26. PROMO_CODE_USES
CREATE TABLE promo_code_uses (
  use_id INT AUTO_INCREMENT PRIMARY KEY,
  promo_code_id INT NOT NULL,
  customer_id INT NOT NULL,   
  sale_id INT NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(promo_code_id),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
);