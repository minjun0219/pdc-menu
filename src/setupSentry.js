const Sentry = require('@sentry/node');

let isSentryInit = false;
module.exports = function setupSentry() {
  if (process.env.SENTRY_DSN && !isSentryInit) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    global.Sentry = Sentry;
    isSentryInit = true;
  }
  return global.Sentry;
};
