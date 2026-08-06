const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { list, create, markRead, markAllRead, remove } = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

router.get('/', list);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager'),
  [
    body('user_id').isInt().withMessage('user_id is required'),
    body('title').notEmpty().withMessage('title is required'),
    body('message').notEmpty().withMessage('message is required'),
  ],
  validate,
  create
);

router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', remove);

module.exports = router;
