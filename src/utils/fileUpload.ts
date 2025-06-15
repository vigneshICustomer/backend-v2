import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import environment from '../config/environment';

// Get upload directory from environment variables
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB default

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // Get tenant ID from request headers
    const tenantId = req.headers['x-tenant-id'] as string;
    
    // Create tenant-specific directory if it doesn't exist
    const tenantDir = path.join(UPLOAD_DIR, tenantId || 'default');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    
    cb(null, tenantDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for JSON files
const jsonFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only JSON files
  if (file.mimetype === 'application/json' || path.extname(file.originalname).toLowerCase() === '.json') {
    cb(null, true);
  } else {
    cb(new Error('Only JSON files are allowed'));
  }
};

// Create multer upload instance for JSON files
export const uploadJsonFile = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: jsonFileFilter
});

/**
 * Read a JSON file and parse its contents
 * @param filePath Path to the JSON file
 * @returns Parsed JSON content
 */
export const readJsonFile = async (filePath: string): Promise<any> => {
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    throw error;
  }
};

/**
 * Delete a file
 * @param filePath Path to the file
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    throw error;
  }
};

export default {
  uploadJsonFile,
  readJsonFile,
  deleteFile
};
