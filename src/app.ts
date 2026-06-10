import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import { startKeepalive } from './shared/sseManager';
import authRoutes from './routes/auth.routes';
import superAdminRoutes from './routes/superAdmin.routes';
import schoolAdminRoutes from './routes/schoolAdmin.routes';
import financeClerkRoutes from './routes/financeClerk.routes';
import teacherRoutes from './routes/teacher.routes';
import vicePrincipalRoutes from './routes/vicePrincipal.routes';
import auditorRoutes from './routes/auditor.routes';
import studentRoutes from './routes/studentRoutes';
import parentRoutes from './routes/parentRoutes';
import driverRoutes from './routes/driverRoutes';
import clinicRoutes from './routes/clinicRoutes';
import libraryRoutes from './routes/libraryRoutes';
import loanRoutes from './routes/loan.routes';
import payrollRoutes from './routes/payroll.routes';
import scheduleRoutes from './routes/schedule.routes';
import sectionAssignmentRoutes from './routes/sectionAssignmentRoutes';
import gradingRoutes from './routes/grading.routes';
import publicRoutes from './routes/public.routes';
import machineRoutes from './routes/machine.routes';
import financeRoutes from './routes/finance.routes';
import guestRoutes from './routes/guest.routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Start SSE keepalive for real-time client connections
startKeepalive();

app.use(helmet());

// Allowed origins (add/remove as needed)
const allowedOrigins = [
  'https://abdi-adama.com',   // Production frontend
  'https://www.abdi-adama.com', // Production frontend with www
  'http://localhost:5173',    // Vite dev server
  'http://localhost:3000',    // Create React App / other dev server
  'http://localhost:4173',    // Vite preview server
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in development mode to support local network device testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Allow requests with no origin (e.g. mobile apps, server-to-server requests, curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cache-Control', 'Pragma', 'x-api-key'],
}));

const limiter = rateLimit({
  windowMs: 7 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100000 : 200000,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 500,
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMIT',
      message: 'Too many login attempts, please try again after 15 minutes'
    }
  }
});

app.use('/api/', limiter);
app.use('/api/auth/login', loginLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Abdi Adama School API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/machine', machineRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/school-admin', schoolAdminRoutes);
app.use('/api/finance-clerk', financeClerkRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/vice-principal', vicePrincipalRoutes);
app.use('/api/auditor', auditorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/transport', driverRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/sections', sectionAssignmentRoutes);
app.use('/api/grading-configs', gradingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/guest', guestRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

app.use(errorHandler);

export default app;
