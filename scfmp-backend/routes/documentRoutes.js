const express = require('express');
const router = express.Router();

const { list, upload, download, remove } = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const { upload: multerUpload } = require('../middleware/uploadMiddleware');

router.use(verifyToken);

router.get('/', list);
router.get('/:id/download', download);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer', 'accountant'),
  multerUpload.single('file'),
  (err, req, res, next) => {
    // Catches Multer-specific errors (file too large, wrong type) with a clean JSON response
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  },
  upload
);

router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), remove);

module.exports = router;
