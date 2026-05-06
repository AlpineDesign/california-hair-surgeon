const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();
// App Runner / ALB terminate TLS; Express must honor X-Forwarded-Proto so Parse Dashboard sees HTTPS.
app.set('trust proxy', 1);

const clientOrigin = String(config.clientUrl || '').replace(/\/$/, '');
const corsAllowedHeaders = ['Content-Type', 'Authorization', 'X-Scope-Account-Id'];

if (config.isDocumentDb) {
  // AWS / production: unchanged from before — single allowed browser origin.
  app.use(
    cors({
      origin: clientOrigin,
      allowedHeaders: corsAllowedHeaders,
    }),
  );
} else {
  // Local Atlas testing: allow localhost / 127.0.0.1 on any port (e.g. CRA on 3001).
  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
        ) {
          return callback(null, true);
        }
        if (origin === clientOrigin) {
          return callback(null, true);
        }
        callback(null, false);
      },
      allowedHeaders: corsAllowedHeaders,
    }),
  );
}
// Logo upload POSTs base64 JSON; default 100kb is too small (see /api/accounts/logo).
app.use(express.json({ limit: '8mb' }));

async function start() {
  // Parse Server must be mounted and started before routes so the SDK is initialized
  await require('./parse')(app);

  const authRoutes     = require('./routes/auth');
  const surgeryRoutes  = require('./routes/surgeries');
  const userRoutes     = require('./routes/users');
  const settingsRoutes = require('./routes/settings');
  const accountRoutes  = require('./routes/accounts');
  const defaultsRoutes = require('./routes/defaults');
  const patientRoutes  = require('./routes/patients');
  const optionsRoutes  = require('./routes/options');
  const appTestRoutes  = require('./routes/appTest');

  app.use('/api/auth',      authRoutes);
  app.use('/api/surgeries', surgeryRoutes);
  app.use('/api/options',   optionsRoutes);
  app.use('/api/users',     userRoutes);
  app.use('/api/settings',  settingsRoutes);
  app.use('/api/accounts',  accountRoutes);
  app.use('/api/defaults',  defaultsRoutes);
  app.use('/api/patients',  patientRoutes);
  app.use('/api/app-test',  appTestRoutes);

  // Production: serve React build
  if (config.isDevelopment === false) {
    const buildPath = path.join(__dirname, '../client/build');
    app.use(express.static(buildPath));
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  }

  app.listen(config.port, '0.0.0.0', () => console.log(`Server running on port ${config.port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
