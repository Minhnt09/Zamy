const { sanitizeLogMessage } = require('../utils/sanitizeLogMessage');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const requestedStatus = Number(error?.statusCode || error?.status);
  const status = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus < 600
    ? requestedStatus
    : 500;

  console.error('Request failed', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: String(req.originalUrl || req.path).split('?')[0],
    status,
    errorName: error?.name || 'Error',
    errorMessage: sanitizeLogMessage(error?.message),
    ...(error?.code ? { errorCode: error.code } : {}),
  });

  return res.status(status).json({
    message: status >= 500 ? 'Internal server error' : (error?.message || 'Request failed'),
  });
}

module.exports = errorHandler;
