use `413_race`;
ALTER TABLE payments
ADD COLUMN card_number VARCHAR(30) NULL AFTER transaction_id;