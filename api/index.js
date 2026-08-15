// Vercel detects this export as one Express Function. All /api/* requests are
// routed here, while Express keeps the original URL for its mounted API routes.
module.exports = require('../scfmp-backend/app');
