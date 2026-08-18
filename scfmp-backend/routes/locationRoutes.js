const express = require('express');
const { query } = require('express-validator');
const { cells, districts, sectors, villages } = require('../controllers/locationController');
const { verifyToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(verifyToken);
router.get('/districts', districts);
router.get(
  '/sectors',
  [query('district').trim().notEmpty().withMessage('district is required')],
  validate,
  sectors
);
router.get(
  '/cells',
  [
    query('district').trim().notEmpty().withMessage('district is required'),
    query('sector').trim().notEmpty().withMessage('sector is required'),
  ],
  validate,
  cells
);
router.get(
  '/villages',
  [
    query('district').trim().notEmpty().withMessage('district is required'),
    query('sector').trim().notEmpty().withMessage('sector is required'),
    query('cell').trim().notEmpty().withMessage('cell is required'),
  ],
  validate,
  villages
);

module.exports = router;
