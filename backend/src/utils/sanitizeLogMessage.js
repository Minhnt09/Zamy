function sanitizeLogMessage(value) {
  return String(value || 'Unknown error')
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/\b(password|token|secret|authorization|database_url)\b\s*([=:])\s*[^\s,;]+/gi, '$1$2[REDACTED]');
}

module.exports = { sanitizeLogMessage };
