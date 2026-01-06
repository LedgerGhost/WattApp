function formatTimestamp(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getFullUrl(req) {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:9876';
  const path = req.originalUrl || req.url;
  return `${protocol}://${host}${path}`;
}

function getClientIp(req) {
  return (
      req.ip ||
      (req.headers['x-forwarded-for'] &&
          req.headers['x-forwarded-for'].split(',')[0].trim()) ||
      (req.connection && req.connection.remoteAddress) ||
      (req.socket && req.socket.remoteAddress) ||
      'unknown'
  );
}

function createErrorResponse(req, statusCode, errorMessage, debugInfo = '') {
  return {
    call: getFullUrl(req),
    timeref: formatTimestamp(new Date()),
    originator: getClientIp(req),
    return_code: statusCode,
    error: errorMessage,
    debuginfo: debugInfo
  };
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  let statusCode = err.statusCode || err.status || 500;

  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'CastError') {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
  }

  const errorResponse = createErrorResponse(
      req,
      statusCode,
      err.message || 'Internal Server Error',
      process.env.NODE_ENV === 'development' ? err.stack : ''
  );

  res.status(statusCode).json(errorResponse);
}

function notFoundHandler(req, res) {
  const errorResponse = createErrorResponse(
      req,
      404,
      'Resource not found',
      `The requested endpoint ${req.method} ${req.path} does not exist`
  );
  res.status(404).json(errorResponse);
}

class ApiError extends Error {
  constructor(statusCode, message, debugInfo = '') {
    super(message);
    this.statusCode = statusCode;
    this.debugInfo = debugInfo;
    this.name = 'ApiError';
  }

  static badRequest(message, debugInfo = '') {
    return new ApiError(400, message, debugInfo);
  }

  static unauthorized(message = 'Unauthorized', debugInfo = '') {
    return new ApiError(401, message, debugInfo);
  }

  static notFound(message = 'Not found', debugInfo = '') {
    return new ApiError(404, message, debugInfo);
  }

  static internal(message = 'Internal server error', debugInfo = '') {
    return new ApiError(500, message, debugInfo);
  }

  static conflict(message, debugInfo = '') {
    return new ApiError(409, message, debugInfo);
  }
}

function sendError(res, req, statusCode, errorMessage, debugInfo = '') {
  const errorResponse = createErrorResponse(req, statusCode, errorMessage, debugInfo);
  res.status(statusCode).json(errorResponse);
}

module.exports = {
  createErrorResponse,
  getFullUrl,
  getClientIp,
  formatTimestamp,
  errorHandler,
  notFoundHandler,
  ApiError,
  sendError
};
