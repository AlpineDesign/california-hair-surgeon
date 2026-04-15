const router = require('express').Router();
const { Parse } = require('../parse');
const { seedAccountFromDefaults } = require('../lib/seedAccount');
const { touchLastActiveAt } = require('../lib/lastActiveAt');

function userPayload(parseUser) {
  return {
    id:        parseUser.id,
    token:     parseUser.getSessionToken(),
    username:  parseUser.get('username')  || '',
    roles:     parseUser.get('roles')     || [],
    accountId: parseUser.get('accountId') || null,
    firstName: parseUser.get('firstName') || '',
    lastName:  parseUser.get('lastName')  || '',
    email:     parseUser.get('email')     || '',
    phone:     parseUser.get('phone')     || '',
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await Parse.User.logIn(username, password);
    await touchLastActiveAt(user.id);
    res.json({ token: user.getSessionToken(), user: userPayload(user) });
  } catch (err) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// POST /api/auth/signup  (Account Owners only — creates user + account)
router.post('/signup', async (req, res) => {
  try {
    const { username, password, firstName, lastName, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    // 1. Create the user (masterKey so we can set roles immediately)
    const user = new Parse.User();
    user.set('username', username);
    user.set('password', password);
    if (email) user.set('email', email);
    user.set('firstName', firstName || '');
    user.set('lastName',  lastName  || '');
    user.set('roles', ['accountOwner']);
    await user.signUp(null, { useMasterKey: true });

    // 2. Create a linked Account
    const Account = Parse.Object.extend('Account');
    const account = new Account();
    account.set('ownerId', user.id);
    await account.save(null, { useMasterKey: true });

    // 3. Link accountId back to user via masterKey query
    //    (avoids mutating the signUp instance which loses its session token)
    const userQuery = new Parse.Query(Parse.User);
    const freshUser = await userQuery.get(user.id, { useMasterKey: true });
    freshUser.set('accountId', account.id);
    await freshUser.save(null, { useMasterKey: true });

    // 4. Seed account with GlobalDefaults (graftButtons + option labels)
    await seedAccountFromDefaults(account.id);

    // 5. Log in to obtain a guaranteed valid session token
    const loggedIn = await Parse.User.logIn(username, password);
    await touchLastActiveAt(loggedIn.id);
    res.status(201).json({ token: loggedIn.getSessionToken(), user: userPayload(loggedIn) });
  } catch (err) {
    const msg = err.code === 202 ? 'Username already taken' : (err.message || 'Signup failed');
    res.status(409).json({ error: msg });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (email) await Parse.User.requestPasswordReset(email);
  } catch {}
  // Always return success to avoid email enumeration
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

module.exports = router;
