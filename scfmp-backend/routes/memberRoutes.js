const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { list, getById, create, update, remove } = require('../controllers/memberController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

// Everyone with a login can view members (scoped to their own cooperative in the controller)
router.get('/', list);
router.get('/:id', getById);

// Only managers, field officers, and super_admin can create/edit/delete members
router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').optional().isString(),
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
