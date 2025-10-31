use `413_race`;
ALTER TABLE users
ADD COLUMN mustChangePassword BOOLEAN NOT NULL DEFAULT false AFTER status;