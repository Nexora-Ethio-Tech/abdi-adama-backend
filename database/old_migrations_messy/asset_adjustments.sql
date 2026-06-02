-- Asset adjustments audit table
CREATE TABLE IF NOT EXISTS asset_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  change_type VARCHAR(20) NOT NULL, -- 'addition' | 'reduction' | 'edit'
  quantity_changed INTEGER NOT NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  cost NUMERIC(12,2), -- total cost for the added items (optional)
  reason TEXT,
  reported_by VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_adjustments_asset ON asset_adjustments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_adjustments_branch ON asset_adjustments(branch_id);
