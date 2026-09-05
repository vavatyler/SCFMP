const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/teamMemberController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();
router.use(verifyToken);

const validators = [
  body('full_name').optional().trim().isLength({ min: 1, max: 150 }),
  body('position').optional().trim().isLength({ min: 1, max: 150 }),
  body('biography').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  body('responsibilities').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  body('skills').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('photo_url').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  body('linkedin_url').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  body('github_url').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive']),
  body('display_order').optional().isInt({ min: 0, max: 10000 }),
];

router.get('/', [query('include_inactive').optional().isBoolean()], validate, controller.list);
router.post('/', checkRole('super_admin'), [
  body('full_name').trim().isLength({ min: 1, max: 150 }),
  body('position').trim().isLength({ min: 1, max: 150 }),
  ...validators.slice(2),
], validate, controller.create);
router.put('/:id', checkRole('super_admin'), [param('id').isInt({ min: 1 }), ...validators], validate, controller.update);
router.delete('/:id', checkRole('super_admin'), [param('id').isInt({ min: 1 })], validate, controller.remove);

module.exports = router;
