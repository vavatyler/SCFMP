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
    body('farm_size_ha').optional().isFloat({ min: 0 }),
    body('crop_type').optional().isString(),
  ],
  validate,
  create
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  update
);

router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), remove);

module.exports = router;
