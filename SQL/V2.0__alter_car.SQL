use `413_race`;
ALTER TABLE cars
ADD COLUMN car_name VARCHAR(150) NOT NULL AFTER car_id;
