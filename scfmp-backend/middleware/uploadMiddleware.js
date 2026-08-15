const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const UPLOAD_DIR = process.env.UPLOAD_DIR
  || (process.env.VERCEL
    ? path.join(os.tmpdir(), 'scfmp-uploads')
    : path.join(__dirname, '..', 'uploads'));

// Ensure the uploads folder exists (it's gitignored, so it won't exist on a fresh clone)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Unique name on disk so two people can't accidentally overwrite each other's
    // "national_id.pdf" — the original filename is preserved separately in the database.
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (Buffer.byteLength(file.originalname, 'utf8') > 255) {
    return cb(new Error('File name is too long'));
  }
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.has(extension)) {
    return cb(null, true);
  } else {
    return cb(new Error('Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, Word, Excel, TXT'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

module.exports = { upload, UPLOAD_DIR };
