// All Parse Server logic is isolated to this file.
// If Parse Server is removed, delete this file and the require() in index.js.
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const Parse = require('parse/node');
const config = require('./config');

module.exports = async function mountParseServer(app) {
  const { appId, masterKey, serverURL } = config.parse;

  const filesAdapter = config.gcs?.bucket && config.gcs?.projectId
    ? {
        module: '@parse/gcs-files-adapter',
        options: {
          projectId: config.gcs.projectId,
          keyFilename: config.gcs.keyFilename,
          bucket: config.gcs.bucket,
          directAccess: true,
        },
      }
    : undefined;

  const server = new ParseServer({
    databaseURI: config.databaseURI,
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
  if (config.dashboard?.user && config.dashboard?.pass) {
    const dashboard = new ParseDashboard({
      apps: [{ appId, masterKey, serverURL, appName: 'Surg Assist' }],
      users: [{ user: config.dashboard.user, pass: config.dashboard.pass }],
      allowInsecureHTTP: config.isDevelopment,
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
