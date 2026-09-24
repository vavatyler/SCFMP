const express = require('express');
const { param } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const controller = require('../controllers/publicTeamController');

const router = express.Router();

// This route intentionally bypasses authentication. The controller has a separate
// response shape that is limited to profiles explicitly marked active and visible.
router.get('/team', controller.list);
router.get('/team/photos/:token', [param('token').isHexadecimal().isLength({ min: 64, max: 64 })], validate, controller.photo);

module.exports = router;
