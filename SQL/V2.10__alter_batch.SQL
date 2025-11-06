

USE db_413_race;
ALTER TABLE batches
ADD COLUMN car_id INT NULL AFTER product_id;

ALTER TABLE batches
MODIFY product_id INT NULL;

ALTER TABLE batches
ADD CONSTRAINT fk_batches_car_id
FOREIGN KEY (car_id) REFERENCES cars(car_id)
ON DELETE RESTRICT ON UPDATE CASCADE;
