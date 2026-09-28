-- V3: Add extra leave types for frontend compatibility
ALTER TABLE leave_type DROP CONSTRAINT IF EXISTS chk_leave_code;

INSERT INTO leave_type (code, name, annual_entitlement_days, requires_balance)
SELECT 'MATERNITY','Maternity Leave',90,FALSE WHERE NOT EXISTS (SELECT 1 FROM leave_type WHERE code='MATERNITY');
INSERT INTO leave_type (code, name, annual_entitlement_days, requires_balance)
SELECT 'PATERNITY','Paternity Leave',15,FALSE WHERE NOT EXISTS (SELECT 1 FROM leave_type WHERE code='PATERNITY');
INSERT INTO leave_type (code, name, annual_entitlement_days, requires_balance)
SELECT 'BEREAVEMENT','Bereavement Leave',5,FALSE WHERE NOT EXISTS (SELECT 1 FROM leave_type WHERE code='BEREAVEMENT');
INSERT INTO leave_type (code, name, annual_entitlement_days, requires_balance)
SELECT 'COMPASSIONATE','Compassionate Leave',3,FALSE WHERE NOT EXISTS (SELECT 1 FROM leave_type WHERE code='COMPASSIONATE');
