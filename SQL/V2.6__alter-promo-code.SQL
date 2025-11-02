use `413_race`;
ALTER TABLE promo_codes
DROP FOREIGN KEY promo_codes_ibfk_1,
DROP COLUMN promotion_id;

ALTER TABLE car_brands
ADD COLUMN image_url VARCHAR(255)
