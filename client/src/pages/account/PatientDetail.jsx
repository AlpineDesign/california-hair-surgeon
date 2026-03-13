import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Divider, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Link as MuiLink, Button, TextField, IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getPatient, updatePatient } from '../../api/patients';
import { getSurgeriesByPatient } from '../../api/surgeries';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import { getTotalGrafts, getGoalPct, formatDate, formatDateMmDdYyyy } from '../../utils/surgery';

// ─── Detail card ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
      <Typography variant="body2" fontWeight={600} color="text.primary">{label}</Typography>
      <Typography variant="body2" color="text.secondary">{value || '—'}</Typography>
    </Box>
  );
}

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const handleSave = () => { onSave(draft); setEditing(false); };
  const handleCancel = () => { setDraft(value || ''); setEditing(false); };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>{label}</Typography>
      {editing ? (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <TextField
            size="small" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            sx={{ width: 160 }}
            autoFocus
          />
          <IconButton size="small" color="primary" onClick={handleSave}><CheckIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={handleCancel}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
          <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setEditing(true)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

// ─── Surgery history table ────────────────────────────────────────────────────

const SURGERY_COLS = ['Date', 'Status', 'Grafts', 'Goal %', ''];

function SurgeryHistoryTable({ surgeries }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {SURGERY_COLS.map((col) => (
              <TableCell key={col}>
                <Typography variant="caption" color="text.secondary">{col}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {surgeries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={SURGERY_COLS.length}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No surgeries on record.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            surgeries.map((s) => (
              <TableRow key={s.id || s.objectId} hover>
                <TableCell>
                  <Typography variant="body2">{formatDate(s.startedAt || s.createdAt)}</Typography>
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <GraftProgressBar current={getTotalGrafts(s)} goal={s.graftGoal ?? 0} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{getGoalPct(s)}</Typography>
                </TableCell>
                <TableCell>
                  <MuiLink
                    component={Link}
                    to={`/dashboard/surgeries/${s.id || s.objectId}`}
                    variant="body2"
                    fontWeight={600}
                  >
                    View
                  </MuiLink>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([getPatient(id), getSurgeriesByPatient(id)]);
      setPatient(p);
      setSurgeries(s);
    } catch (err) {
      console.error('Failed to load patient', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUpdate = useCallback(async (field, value) => {
    try {
      const updated = await updatePatient(id, { [field]: value });
      setPatient(updated);
    } catch (err) {
      console.error('Failed to update patient', err);
    }
  }, [id]);

  if (loading || !patient) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  const activeSurgeries    = surgeries.filter((s) => s.status === 'active');
  const completedSurgeries = surgeries.filter((s) => s.status === 'completed');

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard/patients')}
          variant="text"
          size="small"
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          Back to Patients
        </Button>
        <PageHeader title={`Patient ${patient.initials}`} />
      </Box>

      <Grid container spacing={3}>
        {/* ── Patient profile ──────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Profile</Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Identity</Typography>
              <InfoRow label="Initials" value={patient.initials} />
              <InfoRow label="DOB" value={formatDateMmDdYyyy(patient.dob) || patient.dob} />
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box>
              <Typography variant="caption" color="text.secondary">Hair &amp; Skin</Typography>
              <EditableField
                label="Hair Type"
                value={patient.hairType}
                onSave={(v) => handleUpdate('hairType', v)}
              />
              <EditableField
                label="Hair Color"
                value={patient.hairColor}
                onSave={(v) => handleUpdate('hairColor', v)}
              />
              <EditableField
                label="Hair Caliber"
                value={patient.hairCaliber}
                onSave={(v) => handleUpdate('hairCaliber', v)}
              />
              <EditableField
                label="Skin Color"
                value={patient.skinColor}
                onSave={(v) => handleUpdate('skinColor', v)}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Total surgeries</Typography>
                <Typography variant="body2" fontWeight={700}>{surgeries.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Record created</Typography>
                <Typography variant="body2">{formatDate(patient.createdAt)}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* ── Surgery history ───────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          {activeSurgeries.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" fontWeight={700}>Active</Typography>
                <Chip label={activeSurgeries.length} size="small" color="success" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <SurgeryHistoryTable surgeries={activeSurgeries} />
            </Paper>
          )}

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" fontWeight={700}>Surgery History</Typography>
              <Chip label={completedSurgeries.length} size="small" />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <SurgeryHistoryTable surgeries={completedSurgeries} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
