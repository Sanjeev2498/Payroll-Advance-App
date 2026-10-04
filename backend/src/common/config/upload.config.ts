import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

export const uploadConfig: MulterOptions = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
    fieldSize: 1024 * 1024, // 1MB field size limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Validate MIME type and extension
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      // Additional security: check for double extensions
      const fileName = file.originalname.toLowerCase();
      const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar'];
      const hasSuspiciousPattern = suspiciousPatterns.some(pattern => fileName.includes(pattern));
      
      if (hasSuspiciousPattern) {
        cb(new Error('File contains suspicious patterns and cannot be uploaded'), false);
      } else {
        cb(null, true);
      }
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }
  },
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = './uploads/secure';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true, mode: 0o755 });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate secure filename with timestamp and random string
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const extension = path.extname(sanitizedName);
      const baseName = path.basename(sanitizedName, extension);
      cb(null, `${uniqueSuffix}_${baseName}${extension}`);
    },
  }),
};

// Specific configurations for different upload types
export const avatarUploadConfig: MulterOptions = {
  ...uploadConfig,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF) are allowed for avatars'), false);
    }
  },
};

export const documentUploadConfig: MulterOptions = {
  ...uploadConfig,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for documents
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only document files (PDF, DOC, DOCX, XLS, XLSX) are allowed'), false);
    }
  },
};