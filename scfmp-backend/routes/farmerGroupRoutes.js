const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/farmerGroupController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();
router.use(verifyToken);

router.get('/', [
  query('cooperative_id').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['active', 'inactive']),
], validate, controller.list);
router.post('/', checkRole('super_admin', 'cooperative_manager', 'field_officer'), [
  body('cooperative_id').optional().isInt({ min: 1 }),
  body('name').trim().isLength({ min: 1, max: 150 }),
  body('location').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('status').optional().isIn(['active', 'inactive']),
], validate, controller.create);
router.put('/:id', checkRole('super_admin', 'cooperative_manager', 'field_officer'), [
  param('id').isInt({ min: 1 }),
  body('name').optional().trim().isLength({ min: 1, max: 150 }),
  body('location').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('status').optional().isIn(['active', 'inactive']),
], validate, controller.update);
router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), [
  param('id').isInt({ min: 1 }),
], validate, controller.remove);

module.exports = router;
