import { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
} from '@mui/material';
import S from '../../strings';

const baseURL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080';

function createHarnessClient() {
  const client = axios.create({ baseURL });
  let token = null;
  client.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return {
    setToken(t) {
      token = t || null;
    },
    clearToken() {
      token = null;
    },
    get client() {
      return client;
    },
  };
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export default function AppTests() {
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [banner, setBanner] = useState(null);

  const pushRow = useCallback((row) => {
    setRows((prev) => [...prev, row]);
  }, []);

  const runStep = useCallback(async (label, fn) => {
    const t0 = nowMs();
    try {
      await fn();
      const ms = Math.round(nowMs() - t0);
      pushRow({ label, ms, ok: true });
      return true;
    } catch (err) {
      const ms = Math.round(nowMs() - t0);
      const msg = err.response?.data?.error || err.message || String(err);
      pushRow({ label, ms, ok: false, error: msg });
      throw err;
    }
  }, [pushRow]);

  const runAll = useCallback(async () => {
    setRows([]);
    setBanner(null);
    setRunning(true);
    const h = createHarnessClient();
    const { client: c } = h;

    const stamp = Date.now();
    const ownerUser = `apptest_owner_${stamp}`;
    const ownerPass = 'TestPass!123';
    const drUser = `apptest_dr_${stamp}`;
    const techUser = `apptest_tech_${stamp}`;
    const userPass = 'TestPass!456';

    let doctorId = null;
    let techId = null;
    let patientId = null;
    let surgeryId = null;

    try {
      await runStep(S.appTestStep_signup, async () => {
        const { data } = await c.post('/api/auth/signup', {
          username: ownerUser,
          password: ownerPass,
          firstName: 'App',
          lastName: 'TestOwner',
          email: `apptest+${stamp}@example.com`,
        });
        h.setToken(data.token);
        if (!data.token) throw new Error('No token from signup');
      });

      h.clearToken();

      await runStep(S.appTestStep_login, async () => {
        const { data } = await c.post('/api/auth/login', {
          username: ownerUser,
          password: ownerPass,
        });
        h.setToken(data.token);
      });

      await runStep(S.appTestStep_createDoctor, async () => {
        const { data } = await c.post('/api/users', {
          username: drUser,
          password: userPass,
          firstName: 'Test',
          lastName: 'Doctor',
          role: 'doctor',
        });
        doctorId = data.id || data.objectId;
        if (!doctorId) throw new Error('No doctor id');
      });

      await runStep(S.appTestStep_createTechnician, async () => {
        const { data } = await c.post('/api/users', {
          username: techUser,
          password: userPass,
          firstName: 'Test',
          lastName: 'Technician',
          role: 'technician',
        });
        techId = data.id || data.objectId;
        if (!techId) throw new Error('No technician id');
      });

      await runStep(S.appTestStep_createPatient, async () => {
        const { data } = await c.post('/api/patients', {
          initials: 'AT',
          dob: '01/15/1985',
          hairType: '',
          hairColor: '',
          hairCaliber: '',
          skinColor: '',
        });
        patientId = data.id || data.objectId;
        if (!patientId) throw new Error('No patient id');
      });

      await runStep(S.appTestStep_createSurgery, async () => {
        const { data } = await c.post('/api/surgeries', {
          patientId,
          graftGoal: 1000,
          surgical: {
            doctorId,
            doctor: 'Test Doctor',
            fueDevice: '',
            fueTipStyle: '',
            fueTipSize: '',
            holdingSolution: '',
            placingDevice: '',
          },
        });
        surgeryId = data.id || data.objectId;
        if (!surgeryId) throw new Error('No surgery id');
      });

      await runStep(S.appTestStep_loadSurgeries, async () => {
        await c.get('/api/surgeries');
      });

      await runStep(S.appTestStep_loadPatients, async () => {
        await c.get('/api/patients');
      });

      await runStep(S.appTestStep_loadHome, async () => {
        await c.get('/api/surgeries');
      });

      await runStep(S.appTestStep_loadSurgeryDetail, async () => {
        await c.get(`/api/surgeries/${surgeryId}`);
      });

      await runStep(S.appTestStep_loadOptions, async () => {
        await c.get('/api/settings/options');
      });

      await runStep(S.appTestStep_startSurgery, async () => {
        await c.patch(`/api/surgeries/${surgeryId}`, {
          status: 'active',
          startedAt: new Date().toISOString(),
          technicianIds: [techId],
        });
      });

      h.clearToken();

      await runStep(S.appTestStep_loginTech, async () => {
        const { data } = await c.post('/api/auth/login', {
          username: techUser,
          password: userPass,
        });
        h.setToken(data.token);
      });

      await runStep(S.appTestStep_loadSurgeriesTech, async () => {
        await c.get('/api/surgeries');
      });

      await runStep(S.appTestStep_loadSurgeryTech, async () => {
        await c.get(`/api/surgeries/${surgeryId}`, { params: { light: '1' } });
      });

      await runStep(S.appTestStep_activities100, async () => {
        const payload = {
          action: 'extraction',
          payload: { label: '1/1', intactHairs: 1, totalHairs: 1 },
        };
        for (let i = 0; i < 100; i += 1) {
          await c.post(`/api/surgeries/${surgeryId}/activities`, payload);
        }
      });

      await runStep(S.appTestStep_logoutTech, async () => {
        h.clearToken();
      });

      await runStep(S.appTestStep_loginDoctor, async () => {
        const { data } = await c.post('/api/auth/login', {
          username: drUser,
          password: userPass,
        });
        h.setToken(data.token);
      });

      await runStep(S.appTestStep_loadSurgeriesDr, async () => {
        await c.get('/api/surgeries');
      });

      await runStep(S.appTestStep_loadSurgeryDr, async () => {
        await c.get(`/api/surgeries/${surgeryId}`);
      });

      await runStep(S.appTestStep_loadActivities, async () => {
        await c.get(`/api/surgeries/${surgeryId}/activities`);
      });

      h.clearToken();

      await runStep(S.appTestStep_loginOwnerPurge, async () => {
        const { data } = await c.post('/api/auth/login', {
          username: ownerUser,
          password: ownerPass,
        });
        h.setToken(data.token);
      });

      await runStep(S.appTestStep_purge, async () => {
        try {
          await c.post('/api/app-test/purge-account');
        } catch (e) {
          if (e.response?.status === 404) {
            throw new Error(S.appTestHarnessDisabled);
          }
          throw e;
        }
      });

      h.clearToken();
      setBanner({ severity: 'success', text: 'Sequence completed.' });
    } catch {
      h.clearToken();
      setBanner({ severity: 'error', text: S.requestFailed });
    } finally {
      setRunning(false);
    }
  }, [runStep]);

  const totalMs = rows.reduce((s, r) => s + r.ms, 0);

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {S.appTestTitle}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {S.appTestIntro}
      </Typography>
      <Button variant="contained" onClick={runAll} disabled={running} sx={{ mb: 2 }}>
        {running ? S.appTestRunning : S.appTestRun}
      </Button>
      {banner && (
        <Alert severity={banner.severity} sx={{ mb: 2 }}>
          {banner.text}
        </Alert>
      )}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{S.appTestStep}</TableCell>
              <TableCell align="right">{S.appTestMs}</TableCell>
              <TableCell>{S.appTestStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={`${idx}-${r.label}`}>
                <TableCell>{r.label}</TableCell>
                <TableCell align="right">{r.ms}</TableCell>
                <TableCell>{r.ok ? S.appTestOk : `${S.appTestFail}: ${r.error || ''}`}</TableCell>
              </TableRow>
            ))}
            {rows.length > 0 && (
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{S.appTestTotal}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {totalMs}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
