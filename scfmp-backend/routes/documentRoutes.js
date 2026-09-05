const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  list,
  upload,
  download,
  remove,
  updateMetadata,
  replaceFile,
  setArchived,
  classification,
  stats,
} = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const { upload: multerUpload, handleUploadError } = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

router.get(
  '/',
  [
    query('cooperative_id').optional().isInt({ min: 1 }),
    query('owner_type').optional().isIn(['cooperative', 'member', 'farmer', 'loan']),
    query('owner_id').optional().isInt({ min: 1 }),
    query('category').optional().trim().isLength({ min: 1, max: 80 }),
    query('document_type').optional().trim().isLength({ min: 1, max: 100 }),
    query('document_date').optional().isISO8601(),
    query('expiry_date').optional().isISO8601(),
    query('uploaded_by').optional().isInt({ min: 1 }),
    query('status').optional().isIn(['active', 'expiring_soon', 'expired', 'archived']),
    query('search').optional().trim().isLength({ max: 255 }),
  ],
  validate,
  list
);
router.get('/classification/options', [query('cooperative_id').optional().isInt({ min: 1 })], validate, classification);
router.get('/stats/summary', [query('cooperative_id').optional().isInt({ min: 1 })], validate, stats);
router.get('/:id/download', [param('id').isInt({ min: 1 })], validate, download);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer', 'accountant'),
  multerUpload.single('file'),
  handleUploadError,
  [
    body('owner_type').isIn(['cooperative', 'member', 'farmer', 'loan']).withMessage('Invalid owner_type'),
    body('owner_id').isInt({ min: 1 }).withMessage('owner_id is required'),
    body('description').optional().trim().isLength({ max: 255 }),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('category').optional().trim().isLength({ min: 1, max: 80 }),
    body('document_type').optional().trim().isLength({ min: 1, max: 100 }),
    body('document_date').optional({ checkFalsy: true }).isISO8601(),
    body('expiry_date').optional({ checkFalsy: true }).isISO8601(),
    body('version').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('tags').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('visibility').optional().isIn(['organization', 'restricted']),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 3000 }),
  ],
  validate,
  upload
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer', 'accountant'),
  [
    param('id').isInt({ min: 1 }),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('category').optional().trim().isLength({ min: 1, max: 80 }),
    body('document_type').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('document_date').optional({ checkFalsy: true }).isISO8601(),
    body('expiry_date').optional({ checkFalsy: true }).isISO8601(),
    body('version').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('tags').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('visibility').optional().isIn(['organization', 'restricted']),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  ],
  validate,
  updateMetadata
);

router.put(
  '/:id/file',
  checkRole('super_admin', 'cooperative_manager', 'field_officer', 'accountant'),
  [param('id').isInt({ min: 1 })],
  validate,
  multerUpload.single('file'),
  handleUploadError,
  replaceFile
);

router.put(
  '/:id/archive',
  checkRole('super_admin', 'cooperative_manager'),
  [param('id').isInt({ min: 1 }), body('archived').isBoolean()],
  validate,
  setArchived
);

router.delete(
  '/:id',
  checkRole('super_admin', 'cooperative_manager'),
  [param('id').isInt({ min: 1 })],
  validate,
  remove
);

module.exports = router;
