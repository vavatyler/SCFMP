const express = require('express');
const router = express.Router();

const { summary, analytics, exportCsv } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Every logged-in role can view their own cooperative's dashboard
router.get('/summary', summary);
router.get('/analytics', analytics);
router.get('/export', exportCsv);

module.exports = router;
