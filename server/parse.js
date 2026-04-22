// All Parse Server logic is isolated to this file.
// If Parse Server is removed, delete this file and the require() in index.js.
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const Parse = require('parse/node');
const config = require('./config');

function buildFilesAdapter() {
  const s3 = config.s3;
  if (!s3?.bucket) return undefined;

  const options = {
    bucket: s3.bucket,
    region: s3.region || 'us-east-1',
    directAccess: s3.directAccess !== false,
  };
  if (s3.bucketPrefix) options.bucketPrefix = s3.bucketPrefix;
  if (s3.accessKey && s3.secretKey) {
    options.accessKey = s3.accessKey;
    options.secretKey = s3.secretKey;
  }

  return {
    module: '@parse/s3-files-adapter',
    options,
  };
}

module.exports = async function mountParseServer(app) {
  const { appId, masterKey, serverURL, masterKeyIps } = config.parse;

  const filesAdapter = buildFilesAdapter();

  const server = new ParseServer({
    databaseURI: config.databaseURI,
    appId,
    masterKey,
    serverURL,
    masterKeyIps,
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
