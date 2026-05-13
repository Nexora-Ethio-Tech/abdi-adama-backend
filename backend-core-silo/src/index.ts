import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import pool from './config/db';
import adminRoutes from './modules/Admin/adminRoutes';
import authRoutes from './modules/Auth/authRoutes';
import libraryRoutes from './modules/Library/libraryRoutes';
import clinicRoutes from './modules/Clinic/clinicRoutes';
import driverRoutes from './modules/Driver/driverRoutes';
import studentRoutes from './modules/Student/studentRoutes';
import parentRoutes from './modules/Parent/parentRoutes';
import examRoutes from './modules/Exam/examRoutes';
import teacherRoutes from './modules/Teacher/teacherRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Swagger / OpenAPI Spec ───────────────────────────────────────────────────
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'School Management Silo API',
    version: '2.0.0',
    description:
      'Modular backend for Student, Parent, Driver, Librarian, ClinicAdmin roles.\n\n' +
      '**Identity Model**\n' +
      '- Students and Parents share the same `school_id` (one identity, two user rows).\n' +
      '- Staff (Driver, Librarian, ClinicAdmin) each have their own unique `school_id` (4-digit suffix).',
  },
  servers: [{ url: `http://localhost:${PORT}` }],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      CreateUserRequest: {
        type: 'object',
        required: ['fullName', 'role'],
        properties: {
          fullName:       { type: 'string', example: 'Abdi Adama' },
          role:            { type: 'string', enum: ['Student', 'Driver', 'Librarian', 'ClinicAdmin'], example: 'Student' },
          password:        { type: 'string', example: '5521', description: 'Optional 4-digit PIN. If omitted, one will be generated.' },
          parentPassword: { type: 'string', example: '9988', description: 'Optional 4-digit PIN for Parent. If omitted, one will be generated (Student role only).' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['school_id', 'password', 'role'],
        properties: {
          school_id: { type: 'string', example: 'STU-1234' },
          password:  { type: 'string', example: '5521' },
          role:      { type: 'string', enum: ['Student', 'Parent', 'Driver', 'Librarian', 'ClinicAdmin'], example: 'Student' },
        },
      },
      AddBookRequest: {
        type: 'object',
        required: ['title', 'author'],
        properties: {
          title:          { type: 'string', example: 'The Great Gatsby' },
          author:         { type: 'string', example: 'F. Scott Fitzgerald' },
          isbn:           { type: 'string', example: '978-0743273565' },
          shelf_location: { type: 'string', example: 'A-12' },
          stock:          { type: 'integer', example: 5 },
        },
      },
    },
  },
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Server & Database health check',
        responses: {
          '200': { description: 'Server UP, DB connected' },
          '500': { description: 'Server UP, DB disconnected' },
        },
      },
    },

    // ── Admin ───────────────────────────────────────────────────────────────
    '/api/admin/create-user': {
      post: {
        tags: ['Admin'],
        summary: 'Create a new user (School Admin only)',
        description:
          'Creates a new identity and user account.\n\n' +
          '- **Student**: also auto-creates a Parent user linked to the same `school_id` with a separate password.\n' +
          '- **Staff**: creates a single unique identity + user.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } } },
        },
        responses: {
          '201': { description: 'User(s) created. Returns school_id and generated passwords.' },
          '400': { description: 'Validation error (missing fullName/role, invalid PIN, etc.)' },
          '409': { description: 'Conflict: identity/role combination already exists.' },
          '500': { description: 'Internal server error.' },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with school_id + password + role',
        description:
          'Authenticates a user by matching `(school_id → identity_id, role)` + verifying bcrypt password.\n\n' +
          'A Student and their Parent can both login with the **same** school_id but choose their own role to get role-specific JWT tokens.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'Login successful. Returns JWT token and user info.' },
          '400': { description: 'Validation error.' },
          '401': { description: 'Invalid credentials.' },
          '403': { description: 'Account deactivated.' },
          '500': { description: 'Internal server error.' },
        },
      },
    },

    // ── Library ─────────────────────────────────────────────────────────────
    '/api/library/stats': {
      get: {
        tags: ['Library'],
        summary: 'Dashboard stats — total collection, active loans, available now',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' }, '403': { description: 'Access denied' } },
      },
    },
    '/api/library/books': {
      get: {
        tags: ['Library'],
        summary: 'List books — supports ?search=, ?page=, ?limit=',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by title, author, or ISBN' },
          { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Paginated book list' }, '403': { description: 'Access denied' } },
      },
    },
    '/api/library/add-book': {
      post: {
        tags: ['Library'],
        summary: 'Add a new book to the catalog',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddBookRequest' } } },
        },
        responses: { '201': { description: 'Book added' }, '409': { description: 'ISBN already exists' } },
      },
    },
    '/api/library/loans': {
      get: {
        tags: ['Library'],
        summary: 'List all active and past loans — supports ?search=, ?page=, ?limit=',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter by student name or book title' },
          { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Loan list with days_overdue and fine_amount calculated' } },
      },
    },
    '/api/library/issue': {
      post: {
        tags: ['Library'],
        summary: 'Issue a book to a student',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['book_id', 'student_id', 'due_date'],
                properties: {
                  book_id:    { type: 'string', description: 'UUID of the book' },
                  student_id: { type: 'string', description: 'UUID or school_id of the student' },
                  due_date:   { type: 'string', format: 'date', example: '2026-06-01' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Book issued, stock decremented' }, '409': { description: 'Out of stock' } },
      },
    },
    '/api/library/return/{loanId}': {
      post: {
        tags: ['Library'],
        summary: 'Mark a loan as returned',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'loanId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Book returned, stock incremented' }, '409': { description: 'Already returned' } },
      },
    },

    // ── Clinic ──────────────────────────────────────────────────────────────
    '/api/clinic/students': {
      get: {
        tags: ['Clinic'],
        summary: 'Student directory — supports ?search=, ?page=, ?limit=',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter by name or school_id' },
          { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'List of students' }, '403': { description: 'Access denied' } },
      },
    },
    '/api/clinic/visits': {
      post: {
        tags: ['Clinic'],
        summary: 'Log a new clinic visit. student_name is auto-resolved from school_id.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['student_id', 'reason'],
                properties: {
                  student_id: { type: 'string', example: 'STU-8995', description: 'school_id or UUID of the student' },
                  reason:     { type: 'string', example: 'Headache' },
                  treatment:  { type: 'string', example: 'Paracetamol 500mg' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Visit logged' }, '404': { description: 'Student not found' } },
      },
    },
    '/api/clinic/visits/history': {
      get: {
        tags: ['Clinic'],
        summary: 'Get clinic visit history — returns date and time as separate fields',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter by student name or reason' },
          { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Visit history with separate date and time fields' } },
      },
    },

    // ── Driver ──────────────────────────────────────────────────────────────
    '/api/driver/manifest': {
      get: {
        tags: ['Driver'],
        summary: "Get driver's route manifest (Driver only)",
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Success' },
          '403': { description: 'Access denied' },
        },
      },
    },
    '/api/driver/notice': {
      post: {
        tags: ['Driver'],
        summary: 'Post a logistics update with title, content, and optional stations',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  title:    { type: 'string', example: 'Route Delay' },
                  content:  { type: 'string', example: '15 minute delay on Route B due to traffic.' },
                  stations: { type: 'string', example: 'Bole, Sarbet, Megenagna', description: 'Comma-separated affected stops' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Notice posted successfully' } },
      },
    },
    '/api/driver/notices': {
      get: {
        tags: ['Driver'],
        summary: 'Get recent logistics notices — supports ?page=, ?limit=',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Success' } },
      },
    },
    '/api/transport/manifest': {
      get: {
        tags: ['Driver'],
        summary: 'Alias for /api/driver/manifest (used by frontend transport service)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Same response as /api/driver/manifest' } },
      },
    },

    // ── Student ─────────────────────────────────────────────────────────────
    '/api/student/profile': {
      get: {
        tags: ['Student'],
        summary: 'Get own profile — includes fullName for "Welcome back!" greeting',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Returns school_id, fullName, section, grade' }, '403': { description: 'Forbidden' } },
      },
    },
    '/api/student/dashboard': {
      get: {
        tags: ['Student'],
        summary: "Student dashboard — today's schedule, upcoming deadlines, teacher of the month",
        description:
          'Returns three data blobs in one call:\n\n' +
          '- **schedule**: today\'s classes filtered by section + current day-of-week\n' +
          '- **deadlines**: upcoming assignments/tasks (Live Exam type excluded — reserved)\n' +
          '- **teacherOfTheMonth**: up to 3 rewarded teachers for the current month',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Dashboard data returned' },
          '403': { description: 'Student role required' },
        },
      },
    },
    '/api/student/grades': {
      get: {
        tags: ['Student'],
        summary: 'Detailed grade breakdown — filterable by semester and subject',
        description:
          'Returns `quiz_10`, `assignment_10`, `mid_30`, `final_50`, and calculated `total` (max 100).\n\n' +
          'When `subject_id` is provided the `selected` field at the top level contains that subject\'s full breakdown.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'semester',   in: 'query', schema: { type: 'integer', enum: [1, 2], default: 2 }, description: 'Academic semester' },
          { name: 'subject_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter to a single subject (optional)' },
        ],
        responses: {
          '200': { description: 'Returns { semester, courses[], selected }' },
          '403': { description: 'Student role required' },
        },
      },
    },
    '/api/student/history': {
      get: {
        tags: ['Student'],
        summary: 'Academic archive — filtered by year & semester, with backend-calculated average',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'year',     in: 'query', required: true, schema: { type: 'string', example: '2024/2025' }, description: 'Academic year (e.g. 2024/2025)' },
          { name: 'semester', in: 'query', schema: { type: 'integer', enum: [1, 2] }, description: 'Filter by semester (optional — omit for both)' },
        ],
        responses: {
          '200': { description: 'Returns [{ year, semester, average, courses[] }]' },
          '400': { description: '"year" query param is required' },
          '403': { description: 'Student role required' },
        },
      },
    },
    '/api/student/profile/{student_id}': {
      get: {
        tags: ['Student'],
        summary: 'Get academic profile & communication book for a student',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'student_id', required: true, schema: { type: 'string', example: 'STU-1234' } }],
        responses: { '200': { description: 'Success' }, '403': { description: 'Forbidden — not linked to this student' } },
      },
    },

    // ── Parent ─────────────────────────────────────────────────────────
    '/api/parent/dashboard': {
      get: {
        tags: ['Parent'],
        summary: "Get parent dashboard: 'My Children' list + Announcements",
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' }, '403': { description: 'Forbidden' } },
      },
    },
  },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  swaggerOptions: { defaultModelsExpandDepth: -1 },
  customCss: '.swagger-ui .topbar { background-color: #1e293b; }',
  customSiteTitle: 'Silo API Docs',
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/admin', adminRoutes);
app.use('/api/auth',  authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/driver',    driverRoutes);
app.use('/api/transport', driverRoutes);  // Frontend alias → same Driver controller
app.use('/api/student',   studentRoutes);
app.use('/api/parent',    parentRoutes);
app.use('/api/exams',     examRoutes);
app.use('/api/teacher',   teacherRoutes);    // Official Exam Secure Environment

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'UP',
      database: 'CONNECTED',
      db_time: result.rows[0].now,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Global Error Handler ───────────────────────────────────────────────────
// Catches JSON parse errors (malformed body) and any unhandled errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body.' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.', detail: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Swagger UI       → http://localhost:${PORT}/api-docs`);
  console.log(`✓ Health Check     → http://localhost:${PORT}/health`);
  console.log(`✓ Admin API        → POST http://localhost:${PORT}/api/admin/create-user`);
  console.log(`✓ Login API        → POST http://localhost:${PORT}/api/auth/login`);
  console.log(`✓ Library API      → GET  http://localhost:${PORT}/api/library/stats`);
  console.log(`✓ Clinic API       → GET  http://localhost:${PORT}/api/clinic/visits/history`);
  console.log(`✓ Driver API       → GET  http://localhost:${PORT}/api/driver/manifest`);
  console.log(`✓ Student API      → GET  http://localhost:${PORT}/api/student/profile`);
  console.log(`✓ Parent API       → GET  http://localhost:${PORT}/api/parent/dashboard`);
  console.log(`✓ Exam API         → GET  http://localhost:${PORT}/api/exams\n`);

  try {
    await pool.query('SELECT 1');
    console.log('✓ Database Connected Successfully\n');
  } catch (err) {
    console.error('✘ Database Connection Failed:', err instanceof Error ? err.message : err);
  }
});
