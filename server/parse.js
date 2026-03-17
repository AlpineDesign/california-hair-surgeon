// All Parse Server logic is isolated to this file.
// If Parse Server is removed, delete this file and the require() in index.js.
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const Parse = require('parse/node');

module.exports = async function mountParseServer(app) {
  const appId     = process.env.PARSE_APP_ID;
  const masterKey = process.env.PARSE_MASTER_KEY;
  const port      = process.env.PORT || 5000;
  const serverURL = process.env.PARSE_SERVER_URL || `http://localhost:${port}/parse`;

  // Files adapter: GCS when GCS_BUCKET + GCP_PROJECT_ID are set, else default (GridFS)
  const gcsBucket = process.env.GCS_BUCKET;
  const gcpProject = process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const filesAdapter = gcsBucket && gcpProject
    ? {
        module: '@parse/gcs-files-adapter',
        options: {
          projectId: gcpProject,
          keyFilename: process.env.GCP_KEYFILE_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
          bucket: gcsBucket,
          directAccess: true, // serve logos directly from GCS
        },
      }
    : undefined;

  const server = new ParseServer({
    databaseURI: process.env.MONGODB_URI,
    appId,
    masterKey,
    serverURL,
    allowClientClassCreation: false,
    filesAdapter,
  });

  // v7+ requires explicit start() before mounting
  await server.start();
  app.use('/parse', server.app);
  console.log('Parse Server mounted at /parse');

  // Parse Dashboard — browse and edit data at /dashboard
  if (process.env.PARSE_DASHBOARD_USER && process.env.PARSE_DASHBOARD_PASSWORD) {
    const dashboard = new ParseDashboard({
      apps: [{ appId, masterKey, serverURL, appName: 'Surg Assist' }],
      users: [{ user: process.env.PARSE_DASHBOARD_USER, pass: process.env.PARSE_DASHBOARD_PASSWORD }],
      allowInsecureHTTP: process.env.NODE_ENV !== 'production',
    });
    app.use('/dashboard', dashboard);
    console.log('Parse Dashboard mounted at /dashboard');
  }

  // Initialize the Parse Node SDK for server-side use in all routes.
  // Third argument is masterKey — routes use { useMasterKey: true } to bypass ACLs.
  Parse.initialize(appId, null, masterKey);
  Parse.serverURL = serverURL;
};

// Export the initialized Parse instance so route files can require it.
// Always require after mountParseServer() has been called.
module.exports.Parse = Parse;
