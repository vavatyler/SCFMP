const express = require('express');
const router = express.Router();

const {
  list,
  getById,
  create,
  update,
  remove,
} = require('../controllers/cooperativeController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole, checkCooperativeScope } = require('../middleware/roleMiddleware');

router.use(verifyToken);

router.get('/', checkRole('super_admin'), list);
router.get('/:id', checkCooperativeScope, getById);
router.post('/', checkRole('super_admin'), create);
router.put('/:id', checkRole('super_admin', 'cooperative_manager'), checkCooperativeScope, update);
router.delete('/:id', checkRole('super_admin'), remove);

module.exports = router;
