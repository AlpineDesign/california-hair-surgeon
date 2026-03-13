require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
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

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
