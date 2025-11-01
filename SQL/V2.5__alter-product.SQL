use `413_race`;
ALTER TABLE products
ADD COLUMN profit_margin DECIMAL(5,2) DEFAULT 0 CHECK (profit_margin >= 0);

ALTER TABLE cars
ADD COLUMN profit_margin DECIMAL(5,2) DEFAULT 0 CHECK (profit_margin >= 0);