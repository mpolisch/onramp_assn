BEGIN;

CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  part_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cost NUMERIC(10, 2) CHECK (cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, name)
);

CREATE TABLE IF NOT EXISTS inventory (
  part_id INT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (part_id, location_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  part_id INT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  delta INT NOT NULL,
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('adjustment', 'move')),
  transfer_id UUID,
  reason TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: Audit columns that will be queried often
CREATE INDEX idx_audit_log_part_id ON audit_log(part_id);
CREATE INDEX idx_audit_log_transfer_id ON audit_log(transfer_id);

-- View: current inventory by location
CREATE OR REPLACE VIEW inventory_by_location AS
SELECT
  p.part_number,
  p.name AS part_name,
  w.name AS warehouse,
  l.name AS location,
  i.quantity
FROM inventory i
JOIN parts p ON p.id = i.part_id
JOIN locations l ON l.id = i.location_id
JOIN warehouses w ON w.id = l.warehouse_id
ORDER BY w.name, l.name, p.part_number;

-- View: overall inventory across all locations
CREATE OR REPLACE VIEW inventory_overall AS
SELECT
  p.part_number,
  p.name AS part_name,
  p.cost,
  SUM(i.quantity) AS total_quantity
FROM inventory i
JOIN parts p ON p.id = i.part_id
GROUP BY p.id, p.part_number, p.name, p.cost
ORDER BY p.part_number;

COMMIT;