const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { list, getById, create, update, remove } = require('../controllers/farmerController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

router.get('/', list);
router.get('/:id', getById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('member_id').isInt().withMessage('member_id must be a valid member ID'),
    body('farm_size_ha')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0 }).withMessage('Farm size must be a number greater than or equal to zero'),
    body('crop_type')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Crop type must be 100 characters or fewer'),
    body('district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('sector').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('cell').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('village').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  ],
  validate,
  create
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('farm_size_ha')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0 }).withMessage('Farm size must be a number greater than or equal to zero'),
    body('crop_type')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Crop type must be 100 characters or fewer'),
    body('district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('sector').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('cell').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('village').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  ],
  validate,
  update
);

router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), remove);

module.exports = router;
