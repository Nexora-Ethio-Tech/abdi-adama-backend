import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Create upload directories if they don't exist
const uploadDirs = [
  path.join(__dirname, '../../uploads/transcripts'),
  path.join(__dirname, '../../uploads/documents'),
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for transcripts
const transcriptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/transcripts'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${uuidv4()}-${Date.now()}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter for transcripts (accept PDF, images)
const transcriptFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed for transcripts'));
  }
};

// Create multer upload instance for transcripts (max 2MB)
export const uploadTranscript = multer({
  storage: transcriptStorage,
  fileFilter: transcriptFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

// Error handling middleware for multer
export const handleUploadError = (
  err: any,
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: {
          message: 'The file you uploaded is more than 2MB. The system only accepts files smaller than 2MB.',
          code: 'FILE_SIZE_EXCEEDED',
        },
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: {
          message: 'Only one file can be uploaded at a time',
          code: 'LIMIT_FILE_COUNT',
        },
      });
    }
  }
  
  if (err && err.message) {
    return res.status(400).json({
      error: {
        message: err.message,
        code: 'UPLOAD_ERROR',
      },
    });
  }
  
  next();
};

// Utility to delete uploaded file
export const deleteUploadedFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }
};

// Utility to get file path from stored filename
export const getTranscriptFilePath = (filename: string): string => {
  return path.join(__dirname, '../../uploads/transcripts', filename);
};
