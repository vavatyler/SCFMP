const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { list, getById, create, repay, update } = require('../controllers/loanController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

router.get('/', list);
router.get('/:id', getById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'accountant'),
  [
    body('member_id').isInt().withMessage('member_id is required'),
    body('principal_amount').isFloat({ min: 0.01 }).withMessage('principal_amount must be greater than 0'),
    body('issue_date').isDate().withMessage('issue_date must be YYYY-MM-DD'),
  ],
  validate,
  create
);

router.post(
  '/:id/repay',
  checkRole('super_admin', 'cooperative_manager', 'accountant'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('amount must be greater than 0'),
    body('repayment_date').isDate().withMessage('repayment_date must be YYYY-MM-DD'),
  ],
  validate,
  repay
);

router.put('/:id', checkRole('super_admin', 'cooperative_manager', 'accountant'), update);

module.exports = router;
