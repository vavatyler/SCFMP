const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const { list, upload, download, remove } = require('../controllers/documentController');
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
  ],
  validate,
  list
);
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
  ],
  validate,
  upload
);

router.delete(
  '/:id',
  checkRole('super_admin', 'cooperative_manager'),
  [param('id').isInt({ min: 1 })],
  validate,
  remove
);

module.exports = router;
