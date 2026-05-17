-- Add grade column to silo_identities if not exists
ALTER TABLE silo_identities ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

-- Silo Routes Table
CREATE TABLE IF NOT EXISTS silo_routes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID         NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  bus_number  VARCHAR(50)  NOT NULL, -- e.g. 'Bus #4'
  route_name  VARCHAR(100) NOT NULL, -- e.g. 'Route B'
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- Silo Route Manifest (links students to routes)
CREATE TABLE IF NOT EXISTS silo_route_manifest (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES silo_routes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  UNIQUE(route_id, student_id)
);

-- Silo Logistics Notices
CREATE TABLE IF NOT EXISTS silo_logistics_notices (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID        NOT NULL REFERENCES silo_identities(id),
  title        VARCHAR(255),
  message      TEXT        NOT NULL,
  timestamp    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at   TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_silo_routes_driver_id ON silo_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_silo_route_manifest_route_id ON silo_route_manifest(route_id);
CREATE INDEX IF NOT EXISTS idx_silo_logistics_notices_time ON silo_logistics_notices(timestamp);
