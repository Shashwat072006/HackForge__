-- V2__seed.sql — Leave types, company holiday, peak period
-- (Employee seed data handled by DataSeeder.java at runtime via BCrypt)

INSERT INTO leave_type (code, name, annual_entitlement_days, requires_balance) VALUES
  ('ANNUAL',  'Annual Leave',   24.0, TRUE),
  ('SICK',    'Sick Leave',     10.0, FALSE),
  ('CASUAL',  'Casual Leave',    6.0, TRUE),
  ('UNPAID',  'Unpaid Leave',    0.0, FALSE);
