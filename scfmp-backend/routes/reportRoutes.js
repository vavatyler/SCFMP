const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();
const { download } = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);
router.get(
  '/:module',
  [
    param('module').isIn(['members', 'farmers', 'production', 'finance', 'inventory']),
    query('format').optional().isIn(['json', 'csv']),
    query('language').optional().isIn(['en', 'rw', 'fr']),
    query('cooperative_id').optional().isInt({ min: 1 }),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validate,
  download
);

module.exports = router;
