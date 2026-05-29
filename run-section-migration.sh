#!/bin/bash
# Run section assignment migrations

cd "$(dirname "$0")/.."

echo "Running migration: 002_add_grade_to_classes.sql..."
npm run migrate -- migrations/002_add_grade_to_classes.sql

echo "✅ Migration complete!"
