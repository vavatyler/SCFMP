const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  list,
  getById,
  create,
  update,
  remove,
  summary,
  categories,
} = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

// IMPORTANT: static routes must be declared before /:id
router.get('/summary', summary);
router.get('/categories', categories);

router.get('/', list);
router.get('/:id', getById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'accountant'),
  [
    body('type').isIn(['income', 'expense', 'saving']).withMessage('Invalid transaction type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('amount must be greater than 0'),
    body('transaction_date').isDate().withMessage('transaction_date must be YYYY-MM-DD'),
  ],
  validate,
  create
);

router.put('/:id', checkRole('super_admin', 'cooperative_manager', 'accountant'), update);
router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), remove);

module.exports = router;
