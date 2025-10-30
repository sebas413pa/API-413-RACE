USE `413_race`;

-- 1. ROLES
INSERT INTO roles (role_name, status) VALUES
('Administrador', TRUE),
('Empleado', TRUE),
('Cliente', TRUE);

-- 2. USERS
INSERT INTO users (role_id, username, email, password, status) VALUES
(1, 'sebas413', 'sebas@gmail.com', '$2b$12$YNZ/L42ucrbkZ/4BN91JCuZX37uj85Hhwp/ff/MnorzoON3biGohC', TRUE);

-- 3. CITIES
INSERT INTO cities (city_name, status) VALUES
('Ciudad de Guatemala', TRUE),
('Quetzaltenango', TRUE),
('Antigua Guatemala', TRUE);

-- 4. CAR CATEGORIES
INSERT INTO car_categories (category_name, status) VALUES
('Sedan', TRUE),
('SUV', TRUE),
('Pickup', TRUE),
('Hatchback', TRUE);

-- 5. CAR BRANDS
INSERT INTO car_brands (brand_name, status) VALUES
('Toyota', TRUE),
('Honda', TRUE),
('Ford', TRUE),
('Chevrolet', TRUE);

-- 6. CATEGORY_PRODUCTS
INSERT INTO category_products (category_name, status) VALUES
('Aceites y Lubricantes', TRUE),
('Filtros', TRUE),
('Accesorios', TRUE),
('Neumáticos', TRUE);
