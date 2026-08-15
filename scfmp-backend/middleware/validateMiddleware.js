const { validationResult } = require('express-validator');
const fs = require('fs');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Multipart validation happens after Multer has written the temporary file.
    // Remove it when the accompanying fields are invalid so failed requests do
    // not accumulate orphaned uploads.
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;
