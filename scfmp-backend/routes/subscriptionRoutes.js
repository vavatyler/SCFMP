const express = require('express');
const { query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { getOverview } = require('../controllers/subscriptionController');

const router = express.Router();
router.use(verifyToken);
router.get('/', [query('cooperative_id').optional().isInt({ min: 1 })], validate, getOverview);

module.exports = router;
