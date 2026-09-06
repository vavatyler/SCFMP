const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

// Multipart overhead also counts toward Vercel Functions' 4.5 MB request-body
// ceiling, so keep the file itself at 4 MB for this server-upload architecture.
const MAX_DOCUMENT_UPLOAD_BYTES = 3.5 * 1024 * 1024;

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
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

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
    const error = new Error('File name is too long');
    error.code = 'DOCUMENT_FILE_NAME_TOO_LONG';
    return cb(error);
  }
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.has(extension)) {
    return cb(null, true);
  } else {
    const error = new Error('Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, Word, Excel, TXT');
    error.code = 'DOCUMENT_FILE_TYPE_UNSUPPORTED';
    return cb(error);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_DOCUMENT_UPLOAD_BYTES },
});

const imageUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (IMAGE_MIME_TYPES.has(file.mimetype) && IMAGE_EXTENSIONS.has(extension)) {
      return cb(null, true);
    }
    const error = new Error('Unsupported image type. Allowed: JPG, PNG, WEBP');
    error.code = 'DOCUMENT_FILE_TYPE_UNSUPPORTED';
    return cb(error);
  },
  limits: { fileSize: MAX_DOCUMENT_UPLOAD_BYTES },
});

const handleUploadError = (error, req, res, next) => {
  if (!error) return next();

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      code: 'DOCUMENT_FILE_TOO_LARGE',
      message: 'The file exceeds the 3.5 MB upload limit',
    });
  }

  const knownErrors = {
    DOCUMENT_FILE_NAME_TOO_LONG: 'The file name is too long',
    DOCUMENT_FILE_TYPE_UNSUPPORTED: 'Unsupported file type',
  };
  if (knownErrors[error.code]) {
    return res.status(400).json({
      success: false,
      code: error.code,
      message: knownErrors[error.code],
    });
  }

  return res.status(400).json({
    success: false,
    code: 'DOCUMENT_UPLOAD_REJECTED',
    message: 'The file upload was rejected',
  });
};

module.exports = {
  upload,
  imageUpload,
  handleUploadError,
  UPLOAD_DIR,
  MAX_DOCUMENT_UPLOAD_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
