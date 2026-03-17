const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

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

  app.use('/api/auth',      authRoutes);
  app.use('/api/surgeries', surgeryRoutes);
  app.use('/api/options',   optionsRoutes);
  app.use('/api/users',     userRoutes);
  app.use('/api/settings',  settingsRoutes);
  app.use('/api/accounts',  accountRoutes);
  app.use('/api/defaults',  defaultsRoutes);
  app.use('/api/patients',  patientRoutes);

  // Production: serve React build
  if (config.isDevelopment === false) {
    const buildPath = path.join(__dirname, '../client/build');
    app.use(express.static(buildPath));
    app.get('/(.*)', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  }

  app.listen(config.port, '0.0.0.0', () => console.log(`Server running on port ${config.port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
