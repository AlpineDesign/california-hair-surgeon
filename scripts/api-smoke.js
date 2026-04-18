#!/usr/bin/env node
/**
 * Hit the Express API like the React client does — no Mongo shell required.
 *
 * Usage:
 *   API_USER=user API_PASS=secret node scripts/api-smoke.js
 *   API_BASE=http://127.0.0.1:8080 API_USER=... API_PASS=... node scripts/api-smoke.js
 *
 * Mutations (creates a throwaway patient + surgery, then deletes them):
 *   API_SMOKE_WRITE=1 API_USER=... API_PASS=... node scripts/api-smoke.js
 *
 * Optional — second account (e.g. technician) to compare responses:
 *   API_USER2=... API_PASS2=...
 */

const BASE = process.env.API_BASE || 'http://127.0.0.1:8080';

async function api(method, path, { token, body, headers: extra = {} } = {}) {
  const url = `${BASE}${path}`;
  const headers = { ...extra };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

function row(label, { status, ok, json }) {
  const err = json && typeof json === 'object' && json.error ? String(json.error) : '';
  const short =
    err ||
    (Array.isArray(json) ? `array(${json.length})` : json && typeof json === 'object' ? `{${Object.keys(json).slice(0, 5).join(',')}${Object.keys(json).length > 5 ? ',…' : ''}}` : String(json).slice(0, 80));
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${status}  ${label}`);
  if (!ok && json && typeof json === 'object') {
    console.log(`       ${JSON.stringify(json)}`);
  } else if (!ok) {
    console.log(`       ${short}`);
  }
}

async function runForUser(label, user, pass) {
  console.log(`\n── ${label} (${user}) ──`);
  const login = await api('POST', '/api/auth/login', { body: { username: user, password: pass } });
  row('POST /api/auth/login', login);
  if (!login.ok || !login.json?.token) {
    console.error('Login failed; skipping remaining calls for this user.');
    return null;
  }
  const token = login.json.token;
  const roles = login.json.user?.roles;
  const accountId = login.json.user?.accountId;
  console.log(`   roles: ${JSON.stringify(roles)}  accountId: ${JSON.stringify(accountId)}`);

  const reads = [
    ['GET', '/api/surgeries'],
    ['GET', '/api/patients'],
    ['GET', '/api/users'],
    ['GET', '/api/users/team'],
    ['GET', '/api/options'],
    ['GET', '/api/settings'],
    ['GET', '/api/settings/options'],
  ];
  for (const [method, path] of reads) {
    const r = await api(method, path, { token });
    row(`${method} ${path}`, r);
  }

  const patchMe = await api('PATCH', '/api/users/me', { token, body: { lastName: login.json.user?.lastName || '' } });
  row('PATCH /api/users/me (no-op lastName)', patchMe);

  const patchMine = await api('PATCH', '/api/accounts/mine', { token, body: {} });
  row('PATCH /api/accounts/mine {}', patchMine);

  if (process.env.API_SMOKE_WRITE === '1') {
    const stamp = `smoke-${Date.now()}`;
    const createPatient = await api('POST', '/api/patients', {
      token,
      body: { initials: stamp.slice(-8), dob: '01/01/1990' },
    });
    row('POST /api/patients', createPatient);
    const pid = createPatient.json?.id;
    if (!createPatient.ok || !pid) {
      console.error('Create patient failed; skipping write chain.');
      return token;
    }

    const createSurgery = await api('POST', '/api/surgeries', {
      token,
      body: { patientId: pid, graftGoal: 1, surgical: {} },
    });
    row('POST /api/surgeries', createSurgery);
    const sid = createSurgery.json?.id;
    if (!createSurgery.ok || !sid) {
      console.error('Create surgery failed; skipping patch/delete.');
      return token;
    }

    const patchSurgery = await api('PATCH', `/api/surgeries/${sid}`, { token, body: { graftGoal: 2 } });
    row(`PATCH /api/surgeries/${sid}`, patchSurgery);

    const delSurg = await api('DELETE', `/api/surgeries/${sid}`, { token });
    row(`DELETE /api/surgeries/${sid}`, delSurg);

    const delPat = await api('DELETE', `/api/patients/${pid}`, { token });
    row(`DELETE /api/patients/${pid}`, delPat);
  } else {
    console.log('\n(Set API_SMOKE_WRITE=1 to run POST patient / POST surgery / PATCH / DELETE chain.)');
  }

  return token;
}

async function main() {
  const u = process.env.API_USER;
  const p = process.env.API_PASS;
  if (!u || !p) {
    console.error('Set API_USER and API_PASS (and optionally API_BASE). Example:');
    console.error('  API_BASE=http://127.0.0.1:8080 API_USER=you API_PASS=secret node scripts/api-smoke.js');
    process.exit(1);
  }

  console.log(`API_BASE=${BASE}`);
  await runForUser('Primary user', u, p);

  const u2 = process.env.API_USER2;
  const p2 = process.env.API_PASS2;
  if (u2 && p2) {
    await runForUser('Secondary user', u2, p2);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
