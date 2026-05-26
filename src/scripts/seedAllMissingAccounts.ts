import dotenv from 'dotenv';
import pool from '../config/database';
import { hashPassword } from '../utils/password';

dotenv.config();

async function seedAllMissingAccounts() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding all missing accounts...\n');
        await client.query('BEGIN');

        // Get Main Branch
        const branchRes = await client.query("SELECT id FROM branches WHERE name = 'Main Branch' LIMIT 1");
        if (branchRes.rows.length === 0) {
            throw new Error('Main Branch not found. Please run superadmin seed first.');
        }
        const branchId = branchRes.rows[0].id;
        console.log(`Using branch: ${branchId}\n`);

        // Finance Staff
        const financeStaff = [
            { digital_id: 'FIN-MB-0001', email: 'fin-mb-0001@abdiadama.school', name: 'Finance Officer 1', password: '2986' },
            { digital_id: 'FIN-MB-0002', email: 'fin-mb-0002@abdiadama.school', name: 'Finance Officer 2', password: '9792' }
        ];

        // Teachers
        const teachers = [
            { digital_id: 'TCH-MB-0001', email: 'tch-mb-0001@abdiadama.school', name: 'Teacher 1', password: '5741' },
            { digital_id: 'TCH-MB-0002', email: 'tch-mb-0002@abdiadama.school', name: 'Teacher 2', password: '8293' }
        ];

        // Drivers
        const drivers = [
            { digital_id: 'DRV-MB-0001', email: 'drv-mb-0001@abdiadama.school', name: 'Driver 1', password: '2843' },
            { digital_id: 'DRV-MB-0002', email: 'drv-mb-0002@abdiadama.school', name: 'Driver 2', password: '3074' }
        ];

        // Librarian
        const librarians = [
            { digital_id: 'LIB-MB-0001', email: 'lib-mb-0001@abdiadama.school', name: 'Librarian', password: '9464' }
        ];

        // Clinic Admin
        const clinicStaff = [
            { digital_id: 'CLN-MB-0001', email: 'cln-mb-0001@abdiadama.school', name: 'Clinic Admin', password: '4927' }
        ];

        // Students
        const students = [
            { digital_id: 'STD-MB-0001', email: 'student10-1@abdiadama.school', name: 'Student 10-A', grade: '10', password: '1972' },
            { digital_id: 'STD-MB-0002', email: 'student10-2@abdiadama.school', name: 'Student 10-B', grade: '10', password: '6473' },
            { digital_id: 'STD-MB-0003', email: 'student10-3@abdiadama.school', name: 'Student 10-C', grade: '10', password: '2475' },
            { digital_id: 'STD-MB-0004', email: 'student7-1@abdiadama.school', name: 'Student 7-A', grade: '7', password: '9931' },
            { digital_id: 'STD-MB-0005', email: 'student7-2@abdiadama.school', name: 'Student 7-B', grade: '7', password: '3174' },
            { digital_id: 'STD-MB-0006', email: 'student7-3@abdiadama.school', name: 'Student 7-C', grade: '7', password: '1167' }
        ];

        // Helper function to create or update user
        async function seedUser(digital_id: string, email: string, name: string, role: string, password: string) {
            const passwordHash = await hashPassword(password);
            const username = digital_id.toLowerCase().replace('-', '_');

            const existing = await client.query(
                'SELECT id FROM users WHERE digital_id = $1 LIMIT 1',
                [digital_id]
            );

            if (existing.rows.length > 0) {
                // Update existing
                await client.query(
                    `UPDATE users SET email = $1, password_hash = $2, status = 'Approved', is_active = true 
           WHERE digital_id = $3`,
                    [email, passwordHash, digital_id]
                );
                console.log(`✅ Updated: ${name} (${digital_id})`);
                return existing.rows[0].id;
            } else {
                // Create new
                const result = await client.query(
                    `INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Approved', true)
           RETURNING id`,
                    [digital_id, username, name, email, passwordHash, role, branchId]
                );
                console.log(`✅ Created: ${name} (${digital_id}) - Password: ${password}`);
                return result.rows[0].id;
            }
        }

        // Seed Finance Staff
        console.log('📊 Finance Staff:');
        for (const staff of financeStaff) {
            await seedUser(staff.digital_id, staff.email, staff.name, 'finance-clerk', staff.password);
        }
        console.log('');

        // Seed Teachers
        console.log('👨‍🏫 Teachers:');
        for (const teacher of teachers) {
            await seedUser(teacher.digital_id, teacher.email, teacher.name, 'teacher', teacher.password);
        }
        console.log('');

        // Seed Drivers
        console.log('🚌 Drivers:');
        for (const driver of drivers) {
            await seedUser(driver.digital_id, driver.email, driver.name, 'driver', driver.password);
        }
        console.log('');

        // Seed Librarian
        console.log('📚 Librarian:');
        for (const staff of librarians) {
            await seedUser(staff.digital_id, staff.email, staff.name, 'librarian', staff.password);
        }
        console.log('');

        // Seed Clinic Admin
        console.log('🏥 Clinic Admin:');
        for (const staff of clinicStaff) {
            await seedUser(staff.digital_id, staff.email, staff.name, 'clinic-admin', staff.password);
        }
        console.log('');

        // Seed Students (skip if already exists)
        console.log('🎓 Students:');
        for (const student of students) {
            const existingStudent = await client.query(
                'SELECT id FROM users WHERE digital_id = $1 LIMIT 1',
                [student.digital_id]
            );

            if (existingStudent.rows.length > 0) {
                console.log(`⏭️  Skipped: ${student.name} (${student.digital_id}) - already exists`);
                continue;
            }

            const userId = await seedUser(student.digital_id, student.email, student.name, 'student', student.password);

            // Create student profile record
            const existingStudentProfile = await client.query('SELECT id FROM students WHERE user_id = $1', [userId]);

            if (existingStudentProfile.rows.length === 0) {
                await client.query(
                    `INSERT INTO students (user_id, branch_id, grade, status)
           VALUES ($1, $2, $3, 'Active')`,
                    [userId, branchId, student.grade]
                );
            }
        }
        console.log('');

        await client.query('COMMIT');

        console.log('\n✅ All accounts seeded successfully!\n');
        console.log('📋 Login Credentials Summary:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('FINANCE STAFF');
        financeStaff.forEach(s => console.log(`  ${s.email}: ${s.password}`));
        console.log('TEACHERS');
        teachers.forEach(s => console.log(`  ${s.email}: ${s.password}`));
        console.log('DRIVERS');
        drivers.forEach(s => console.log(`  ${s.email}: ${s.password}`));
        console.log('LIBRARIAN');
        librarians.forEach(s => console.log(`  ${s.email}: ${s.password}`));
        console.log('CLINIC');
        clinicStaff.forEach(s => console.log(`  ${s.email}: ${s.password}`));
        console.log('STUDENTS');
        students.forEach(s => console.log(`  ${s.email}: ${s.password}`));
        console.log('═══════════════════════════════════════════════════════════');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedAllMissingAccounts();
