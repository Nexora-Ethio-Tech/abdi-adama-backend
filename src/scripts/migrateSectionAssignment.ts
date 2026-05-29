/**
 * Migration Runner: Apply section assignment schema changes
 * Usage: npm run migrate:section-assignment
 * 
 * This script:
 * 1. Adds section_id and previous_section_id FKs to students table
 * 2. Creates section_assignment_audit table for tracking changes
 * 3. Adds capacity/current_count to classes table
 * 4. Creates indexes for performance
 */

import pool from '../config/database';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting migration: Add section assignment support...');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, '../../migrations/001_add_section_to_students.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Execute migration
        console.log('📝 Executing migration SQL...');
        await client.query(migrationSQL);

        console.log('✅ Migration completed successfully!');
        console.log('✅ Added columns: students.section_id, students.previous_section_id, students.section_assigned_at');
        console.log('✅ Created table: section_assignment_audit');
        console.log('✅ Added columns: classes.capacity, classes.current_count');
        console.log('✅ Created indexes for performance');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.release();
        await pool.end();
    }
};

// Run migration
runMigration();
