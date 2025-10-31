use `413_race`;
ALTER TABLE cars
ADD COLUMN car_name VARCHAR(150) NOT NULL AFTER car_id;

ALTER TABLE batches
DROP COLUMN expires_at;

ALTER TABLE cars
DROP COLUMN price;

ALTER TABLE cars
ADD COLUMN purchase_price DECIMAL(10,2) NOT NULL AFTER model,
ADD COLUMN sale_price DECIMAL(10,2) NOT NULL AFTER purchase_price;

ALTER TABLE cars
ADD CONSTRAINT chk_purchase_price_non_negative CHECK (purchase_price >= 0),
ADD CONSTRAINT chk_sale_price_non_negative CHECK (sale_price >= 0);

ALTER TABLE products
DROP COLUMN price;

ALTER TABLE products
MODIFY COLUMN purchase_price DECIMAL(10,2) NOT NULL;

ALTER TABLE products
ADD COLUMN sale_price DECIMAL(10,2) NOT NULL AFTER purchase_price;


