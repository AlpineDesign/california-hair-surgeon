import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Autocomplete, TextField, Chip,
  Paper, CircularProgress, MenuItem, IconButton, Link,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { PictureAsPdf as PictureAsPdfIcon } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useParams, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAdminCompany } from '../../contexts/AdminCompanyContext';
import { getSurgery, updateSurgery, updateExtraction, updatePlacement, createActivity, getActivities } from '../../api/surgeries';
import BrandLogo from '../../components/BrandLogo';
import { updatePatient } from '../../api/patients';
import { getTechnicians, getDoctors } from '../../api/users';
import { getOptions, getSettings } from '../../api/settings';
import GraftProgressBar from '../../components/GraftProgressBar';
import {
  getTotalGrafts, formatDate, formatStartedAt, formatElapsedMs, getPhaseElapsedMs,
  getReportStats, formatElapsedForReport, getTechnicianStatsFromActivities, getGraftCountsByTechnician,
  getReportTechnicianColumns,
  getSurgeryTotalMs, getTechnicianDisplayName, getSelectedTechnicians, getExtractionEntries,
  formatReportDateTime, formatReportTime, formatDateMmDdYyyy,
  mergeSurgeryPatch,
} from '../../utils/surgery';
import StatusBadge from '../../components/StatusBadge';
import PatientModal from '../../components/PatientModal';
import EditTechniciansModal from '../../components/EditTechniciansModal';
import EditDoctorModal from '../../components/EditDoctorModal';
import { colors } from '../../theme/tokens';
import S from '../../strings';
import html2pdf from 'html2pdf.js';
import usePollWhileVisible from '../../hooks/usePollWhileVisible';

const REPORT_PDF_WIDTH = 794; // A4 width in px at 96dpi

// optionsKey maps to getOptions() response (e.g. hairColor → options.hairColors)
const PATIENT_FIELDS = [
  { key: 'dob', label: 'DOB' },
  { key: 'hairType', label: 'Hair Type', optionsKey: 'hairTypes' },
  { key: 'hairColor', label: 'Hair Color', optionsKey: 'hairColors' },
  { key: 'hairCaliber', label: 'Hair Caliber', optionsKey: 'hairCalibers' },
  { key: 'skinColor', label: 'Skin Color', optionsKey: 'skinColors' },
];

const SURGICAL_FIELDS = [
  { key: 'fueDevice', label: 'FUE Device', optionsKey: 'fueDevices' },
  { key: 'fueTipStyle', label: 'FUE Tip Style', optionsKey: 'fueTipStyles' },
  { key: 'fueTipSize', label: 'FUE Tip Size', optionsKey: 'fueTipSizes' },
  { key: 'holdingSolution', label: 'Holding Solution', optionsKey: 'holdingSolutions' },
  { key: 'placingDevice', label: 'Placing Device', optionsKey: 'placingDevices' },
];

const POLL_INTERVAL_MS = 12000;

function useSurgeryActivities(surgeryId, refreshTrigger = 0) {
  const [activities, setActivities] = useState([]);
  const load = useCallback(async () => {
    if (!surgeryId) return;
    try {
      const data = await getActivities(surgeryId);
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setActivities([]);
    }
  }, [surgeryId]);

  useEffect(() => {
    if (!surgeryId) return;
    load();
  }, [surgeryId, load, refreshTrigger]);

  usePollWhileVisible(load, POLL_INTERVAL_MS);

  return activities;
}

function EditableDetailRow({ label, value, fieldKey, section, editing, onEdit, onSave, onCancel, options = [] }) {
  const isEditing = editing?.section === section && editing?.key === fieldKey;
  const [draft, setDraft] = useState(value ?? '');
  const useSelect = options && options.length > 0;

  const handleStartEdit = () => {
    setDraft(value ?? '');
    onEdit(section, fieldKey);
  };

  const handleSave = () => {
    onSave(section, fieldKey, draft);
    onCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(value ?? ''); onCancel(); }
  };

  const inputSx = { maxWidth: 160, '& .MuiInputBase-input': { py: 0.5, textAlign: 'right' } };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        py: 0.5,
        cursor: 'pointer',
        borderRadius: 1,
        px: 1,
        mx: -1,
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={!isEditing ? handleStartEdit : undefined}
    >
      <Typography variant="body2" fontWeight={600} color="text.primary">{label}</Typography>
      {isEditing ? (
        useSelect ? (
          <TextField
            select
            size="small"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            sx={inputSx}
          >
            <MenuItem value=""><em>Select…</em></MenuItem>
            {(options || []).map((o) => {
              const label = typeof o === 'object' && o?.label != null ? o.label : String(o);
              return <MenuItem key={label} value={label}>{label}</MenuItem>;
            })}
          </TextField>
        ) : (
          <TextField
            size="small"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            sx={inputSx}
          />
        )
      ) : (
        <Typography variant="body2" color="text.secondary">{value || '—'}</Typography>
      )}
    </Box>
  );
}

function NotStartedState({ surgery, technicians, doctors = [], onTechniciansChange, onDoctorChange, onFieldSave, options = {} }) {
  const [editing, setEditing] = useState(null);
  const docList = doctors || [];
  const selected = technicians.filter((t) =>
    (surgery.technicianIds || []).includes(t.id || t.objectId)
  );
  const patient = surgery?.patient ?? {};
  const surgical = surgery?.surgical || {};
  const currentDoctorId = surgical.doctorId || surgical.surgeonId || '';
  const currentDoctorName = surgical.doctor ?? surgical.surgeon ?? '';

  const handleFieldSave = async (section, key, value) => {
    await onFieldSave(section, key, value);
    setEditing(null);
  };

  const rowProps = (section, key, opts = []) => ({
    fieldKey: key,
    section,
    editing,
    onEdit: (s, k) => setEditing({ section: s, key: k }),
    onSave: handleFieldSave,
    onCancel: () => setEditing(null),
    options: opts,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 1000 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 3, textAlign: 'center' }}>
          Surgery Not Started
        </Typography>
        {/* Two info cards */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
          <Paper sx={{ flex: 1, minWidth: 240, p: 3 }}>
            <Typography variant="overline" fontWeight={600} color="primary.main" sx={{ display: 'block', mb: 1, borderBottom: 2, borderColor: 'primary.main', pb: 0.5 }}>
              Patient
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
              {patient.initials || '—'}
            </Typography>
            {PATIENT_FIELDS.map(({ key, label, optionsKey }) => (
              <EditableDetailRow
                key={key}
                label={label}
                value={key === 'dob' ? (formatDateMmDdYyyy(patient.dob) || patient.dob) : patient[key]}
                {...rowProps('patient', key, optionsKey ? (options[optionsKey] || []) : [])}
              />
            ))}
          </Paper>
          <Paper sx={{ flex: 1, minWidth: 240, p: 3 }}>
            <Typography variant="overline" fontWeight={600} color="primary.main" sx={{ display: 'block', mb: 1, borderBottom: 2, borderColor: 'primary.main', pb: 0.5 }}>
              Surgery
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
              {formatDate(surgery?.startedAt || surgery?.createdAt)}
            </Typography>
            {SURGICAL_FIELDS.map(({ key, label, optionsKey }) => (
              <EditableDetailRow
                key={key}
                label={label}
                value={surgical[key]}
                {...rowProps('surgical', key, optionsKey ? (options[optionsKey] || []) : [])}
              />
            ))}
            <EditableDetailRow
              label="Graft Goal"
              value={surgery?.graftGoal}
              {...rowProps('surgery', 'graftGoal')}
            />
          </Paper>
        </Box>

        {/* Doctor and Technicians cards side by side */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ flex: 1, minWidth: 240, p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
              {S.doctor}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={currentDoctorId || ''}
              onChange={(e) => {
                const id = e.target.value;
                const doctor = docList.find((d) => (d.id || d.objectId) === id);
                const name = doctor ? [doctor.firstName, doctor.lastName].filter(Boolean).join(' ') || doctor.username : '';
                onDoctorChange?.(id, name);
              }}
              label={S.selectSurgeon}
              SelectProps={{
                displayEmpty: true,
                renderValue: (v) => {
                  if (v) {
                    const d = docList.find((x) => (x.id || x.objectId) === v);
                    return d ? [d.firstName, d.lastName].filter(Boolean).join(' ') || d.username : currentDoctorName;
                  }
                  return currentDoctorName || 'Select doctor…';
                },
              }}
            >
              <MenuItem value=""><em>Select doctor…</em></MenuItem>
              {docList.map((d) => (
                <MenuItem key={d.id || d.objectId} value={d.id || d.objectId}>
                  {[d.firstName, d.lastName].filter(Boolean).join(' ') || d.username}
                </MenuItem>
              ))}
            </TextField>
          </Paper>
          <Paper sx={{ flex: 1, minWidth: 240, p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
              Technicians (optional)
            </Typography>
            <Autocomplete
              multiple
              options={technicians}
              value={selected}
              onChange={(_, val) => onTechniciansChange(val.map((t) => t.id || t.objectId))}
              getOptionLabel={(t) => [t.firstName, t.lastName].filter(Boolean).join(' ') || t.username}
              isOptionEqualToValue={(a, b) => (a?.id || a?.objectId) === (b?.id || b?.objectId)}
              noOptionsText="No technicians in this account"
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="Select technicians" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((t, idx) => (
                  <Chip
                    key={t.id || t.objectId}
                    label={[t.firstName, t.lastName].filter(Boolean).join(' ') || t.username}
                    size="small"
                    {...getTagProps({ index: idx })}
                  />
                ))
              }
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

function InProgressState({ surgery, surgeryId, options, onUpdate, technicians, doctors = [], onTechniciansChange, onDoctorChange, hidePatientEdit }) {
  const [techniciansModalOpen, setTechniciansModalOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [activitiesRefresh, setActivitiesRefresh] = useState(0);
  const activities = useSurgeryActivities(surgeryId, activitiesRefresh);

  const patient = surgery?.patient ?? {};
  const extractionStarted = surgery?.extraction?.startedAt;
  const extractionCompleted = !!surgery?.extraction?.completedAt;
  const extractionNotStarted = !extractionStarted;
  const placementStarted = surgery?.placement?.startedAt;
  const placementCompleted = !!surgery?.placement?.completedAt;
  const placementNotStarted = !placementStarted;

  const selectedTechnicians = getSelectedTechnicians(technicians, surgery);
  const totalElapsed = surgery?.startedAt
    ? (Date.now() - new Date(surgery.startedAt).getTime())
    : 0;
  const extractionElapsed = getPhaseElapsedMs(surgery?.extraction);
  const placementElapsed = getPhaseElapsedMs(surgery?.placement);

  const entries = getExtractionEntries(surgery, options);
  const totalExtracted = getTotalGrafts(surgery);
  const extractionStats = getReportStats(surgery);
  const goal = surgery?.graftGoal ?? 0;
  const technicianStats = getTechnicianStatsFromActivities(activities);

  const handleIncrementExtraction = async (index) => {
    const entry = entries[index];
    if (!entry) return;
    try {
      const { surgery: updated } = await createActivity(surgeryId, {
        action: 'extraction',
        payload: { label: entry.label, intactHairs: entry.intactHairs, totalHairs: entry.totalHairs },
      });
      onUpdate((prev) => mergeSurgeryPatch(prev, updated));
      setActivitiesRefresh((r) => r + 1);
    } catch (err) {
      console.error('Failed to update extraction', err);
    }
  };

  const handleStartExtraction = async () => {
    try {
      const updated = await updateExtraction(surgeryId, {
        startedAt: new Date().toISOString(),
        completedAt: null,
        accumulatedElapsedMs: 0,
        resumedAt: null,
      });
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to start extraction', err);
    }
  };

  const handleStartPlacement = async () => {
    try {
      const updated = await updatePlacement(surgeryId, {
        startedAt: new Date().toISOString(),
        completedAt: null,
        accumulatedElapsedMs: 0,
        resumedAt: null,
      });
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to start placement', err);
    }
  };

  const handleResumeExtraction = async () => {
    try {
      const updated = await updateExtraction(surgeryId, {
        completedAt: null,
        resumedAt: new Date().toISOString(),
      });
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to resume extraction', err);
    }
  };

  const handleResumePlacement = async () => {
    try {
      const updated = await updatePlacement(surgeryId, {
        completedAt: null,
        resumedAt: new Date().toISOString(),
      });
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to resume placement', err);
    }
  };

  const handleStopExtraction = async () => {
    try {
      const ext = surgery?.extraction || {};
      const accumulated = ext.accumulatedElapsedMs ?? 0;
      const segment = ext.resumedAt
        ? Date.now() - new Date(ext.resumedAt).getTime()
        : ext.startedAt
          ? Date.now() - new Date(ext.startedAt).getTime()
          : 0;
      const updated = await updateExtraction(surgeryId, {
        completedAt: new Date().toISOString(),
        accumulatedElapsedMs: accumulated + segment,
        resumedAt: null,
      });
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to stop extraction', err);
    }
  };

  const handleStopPlacement = async () => {
    try {
      const plc = surgery?.placement || {};
      const accumulated = plc.accumulatedElapsedMs ?? 0;
      const segment = plc.resumedAt
        ? Date.now() - new Date(plc.resumedAt).getTime()
        : plc.startedAt
          ? Date.now() - new Date(plc.startedAt).getTime()
          : 0;
      const updated = await updatePlacement(surgeryId, {
        completedAt: new Date().toISOString(),
        accumulatedElapsedMs: accumulated + segment,
        resumedAt: null,
      });
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to stop placement', err);
    }
  };

  const patientId = patient?.id || patient?.objectId;
  const patientHair = [patient?.hairType, patient?.hairColor].filter(Boolean).join(' ') || '—';
  const technicianNames = selectedTechnicians.map((t) => getTechnicianDisplayName(t));
  const surgical = surgery?.surgical || {};
  const currentDoctorId = surgical.doctorId || surgical.surgeonId || '';
  const currentDoctorUser = doctors.find((d) => (d.id || d.objectId) === currentDoctorId);
  const doctorDisplayName = currentDoctorUser
    ? [currentDoctorUser.firstName, currentDoctorUser.lastName].filter(Boolean).join(' ') || currentDoctorUser.username
    : (surgical.doctor || surgical.surgeon || '—');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', p: 4, width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 3, width: '100%', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Top card: Surgery status, time, patient, technicians, Finish */}
        <Paper sx={{ p: 4, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 5 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} color="text.primary">Surgery</Typography>
                <StatusBadge status="active" />
              </Box>
              <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ mb: 1, lineHeight: 1.2 }}>
                {formatElapsedMs(totalElapsed)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <Box component="span" fontWeight={600}>Started:</Box> {formatStartedAt(surgery?.startedAt)}
              </Typography>
            </Box>

            <Box sx={{ minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: .25 }}>
                <Typography variant="subtitle1" fontWeight={600} color="text.primary">Patient</Typography>
                {patientId && !hidePatientEdit && (
                  <Link
                    component="button"
                    underline="always"
                    sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main' }}
                    onClick={() => setPatientModalOpen(true)}
                  >
                    {S.edit}
                  </Link>
                )}
              </Box>
              <PatientModal
                mode="edit"
                patient={patient}
                open={patientModalOpen}
                onClose={() => setPatientModalOpen(false)}
                onSaved={(updated) => onUpdate({ ...surgery, patient: { ...(surgery?.patient || {}), ...updated } })}
              />
              <Typography variant="body2" color="text.primary" sx={{ py: 0.25 }}>Name: {patient?.initials || '—'}</Typography>
              <Typography variant="body2" color="text.primary" sx={{ py: 0.25 }}>Hair: {patientHair}</Typography>
              <Typography variant="body2" color="text.primary" sx={{ py: 0.25 }}>Caliber: {patient?.hairCaliber || '—'}</Typography>
            </Box>

            <Box sx={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: 1.5 }}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.25 }}>Technicians</Typography>
                  <Link
                    component="button"
                    underline="always"
                    sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main' }}
                    onClick={() => setTechniciansModalOpen(true)}
                  >
                    {S.edit}
                  </Link>
                </Box>
                <Typography variant="body2" color="text.primary" sx={{ pt: 0, pb: 0.25 }}>{technicianNames.length ? technicianNames.join(', ') : '—'}</Typography>
                <EditTechniciansModal
                  open={techniciansModalOpen}
                  onClose={() => setTechniciansModalOpen(false)}
                  technicians={technicians}
                  value={surgery?.technicianIds || []}
                  onSave={(ids) => onTechniciansChange(ids)}
                />
              </Box>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.25 }}>{S.doctor}</Typography>
                  <Link
                    component="button"
                    underline="always"
                    sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main' }}
                    onClick={() => setDoctorModalOpen(true)}
                  >
                    {S.edit}
                  </Link>
                </Box>
                <Typography variant="body2" color="text.primary" sx={{ pt: 0, pb: 0.25 }}>{doctorDisplayName}</Typography>
                <EditDoctorModal
                  open={doctorModalOpen}
                  onClose={() => setDoctorModalOpen(false)}
                  doctors={doctors}
                  value={currentDoctorId}
                  onSave={(doctorId, name) => onDoctorChange?.(doctorId, name)}
                />
              </Box>
            </Box>

            <Box sx={{ alignSelf: 'flex-end' }}>
              {/* Finish Surgery is in header */}
            </Box>
          </Box>
        </Paper>

        {/* Extraction + Placement side-by-side */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ flex: 1, minWidth: 280, p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} color="text.primary">Extraction</Typography>
                <Chip
                  label={extractionCompleted ? S.statusCompleted : extractionNotStarted ? S.statusNotStarted : S.statusInProgress}
                  size="small"
                  color={extractionCompleted ? 'primary' : 'default'}
                  sx={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}
                />
              </Box>
              <Button
                variant="outlined"
                size="medium"
                onClick={extractionNotStarted ? handleStartExtraction : extractionCompleted ? handleResumeExtraction : handleStopExtraction}
              >
                {extractionNotStarted ? S.startTimer : extractionCompleted ? S.resumeTimer : S.stopTimer}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: extractionStarted ? 1 : 2 }}>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                {formatElapsedMs(extractionElapsed)}
              </Typography>
              {extractionCompleted && <CheckCircleIcon color="primary" sx={{ fontSize: 28 }} />}
            </Box>
            {extractionStarted && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <Box component="span" fontWeight={600}>Started:</Box> {formatStartedAt(extractionStarted)}
              </Typography>
            )}
            <Box sx={{ mb: 2 }}>
              <GraftProgressBar current={totalExtracted} goal={Math.max(goal, 1)} />
            </Box>
          </Paper>

          <Paper sx={{ flex: 1, minWidth: 280, p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} color="text.primary">Placement</Typography>
                <Chip
                  label={placementCompleted ? S.statusCompleted : placementNotStarted ? S.statusNotStarted : S.statusInProgress}
                  size="small"
                  color={placementCompleted ? 'primary' : 'default'}
                  sx={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}
                />
              </Box>
              <Button
                variant="outlined"
                size="medium"
                onClick={placementNotStarted ? handleStartPlacement : placementCompleted ? handleResumePlacement : handleStopPlacement}
              >
                {placementNotStarted ? S.startTimer : placementCompleted ? S.resumeTimer : S.stopTimer}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: placementStarted ? 1 : 2 }}>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                {formatElapsedMs(placementElapsed)}
              </Typography>
              {placementCompleted && <CheckCircleIcon color="primary" sx={{ fontSize: 28 }} />}
            </Box>
            {placementStarted && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <Box component="span" fontWeight={600}>Started:</Box> {formatStartedAt(placementStarted)}
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Extraction highlights - separate cards below Extraction & Placement */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mt: 3, width: '100%' }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: 'inherit' }}>{extractionStats.totalGrafts ?? 0}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, color: 'inherit' }}>{S.totalGrafts}</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="text.primary">{extractionStats.totalHairs ?? 0}</Typography>
            <Typography variant="caption" color="text.secondary">{S.totalHairs}</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="text.primary">{extractionStats.singleGrafts ?? 0}</Typography>
            <Typography variant="caption" color="text.secondary">{S.singleGrafts}</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              {extractionStats.totalHairs ? `${(extractionStats.hairTransectionRate * 100).toFixed(2)}%` : '0%'}
            </Typography>
            <Typography variant="caption" color="text.secondary">{S.transRateHair}</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              {extractionStats.totalGrafts ? `${(extractionStats.graftTransectionRate * 100).toFixed(2)}%` : '0%'}
            </Typography>
            <Typography variant="caption" color="text.secondary">{S.transRateGrafts}</Typography>
          </Paper>
        </Box>

        {/* Technician performance cards - 4 column grid */}
        {selectedTechnicians.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mt: 3, width: '100%' }}>
            {selectedTechnicians.map((tech) => {
              const tid = tech.id || tech.objectId;
              const stats = technicianStats.get(tid) || {};
              const statRows = [
                { key: 'graftCount', label: S.graftCount, value: stats.graftCount ?? 0 },
                { key: 'hairCount', label: S.hairCount, value: stats.hairCount ?? 0 },
                { key: 'potHair', label: S.potHair, value: stats.potHair ?? 0 },
                { key: 'transRateHair', label: S.transRateHair, value: stats.transRateHair != null ? `${stats.transRateHair.toFixed(2)}%` : '0%' },
                { key: 'transRateGrafts', label: S.transRateGrafts, value: stats.transRateGrafts != null ? `${stats.transRateGrafts.toFixed(2)}%` : '0%' },
              ];
              return (
                <Paper key={tid} sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ mb: 2 }}>
                    {getTechnicianDisplayName(tech)}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {statRows.map(({ key, label, value }) => (
                      <Box key={key}>
                        <Typography variant="h5" fontWeight={700} color="text.primary">{value}</Typography>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
    </Box>
  );
}

function ReportValue({ value }) {
  const hasValue = value != null && value !== '';
  return (
    <Typography
      component="span"
      variant="body2"
      color="text.secondary"
      fontWeight={400}
      data-report-value
      sx={{
        ...(hasValue ? {} : { bgcolor: colors.todo, px: 0.5, borderRadius: 0.5 }),
      }}
    >
      {hasValue ? value : 'todo'}
    </Typography>
  );
}

function ReportRow({ label, value }) {
  return (
    <Box data-report-row sx={{ display: 'flex', gap: 2, py: 0.5 }}>
      <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ minWidth: 140 }}>
        {label}:
      </Typography>
      <ReportValue value={value} />
    </Box>
  );
}

function DoneState({ surgery, surgeryId, company, technicians, options, onReport, onExportPdfReady }) {
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const activities = useSurgeryActivities(surgeryId);
  const patient = surgery?.patient ?? {};
  const surgical = surgery?.surgical || {};
  const entries = surgery?.extraction?.entries ?? [];
  const stats = getReportStats(surgery);
  const graftButtons = surgery?.graftButtons ?? options?.graftButtons ?? [];

  const sxTotalMs = getSurgeryTotalMs(surgery);
  const extractionTotalMs = getPhaseElapsedMs(surgery?.extraction) || null;
  const placementTotalMs = getPhaseElapsedMs(surgery?.placement) || null;

  const { byTech, graftTypes, techIds } = getGraftCountsByTechnician(activities, graftButtons);
  const techColumns = getReportTechnicianColumns(technicians, surgery, activities, techIds);
  const technicianStats = getTechnicianStatsFromActivities(activities);

  const handleExportPdf = useCallback(() => {
    if (!reportRef.current) return;
    setExporting(true);
    const dateStr = (surgery?.startedAt || surgery?.completedAt) ? new Date(surgery.startedAt || surgery.completedAt).toISOString().slice(0, 10) : '';
    const filename = `surgery-report-${(patient?.initials || 'report').replace(/\s/g, '')}-${dateStr}.pdf`;
    html2pdf()
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          onclone: (_, clonedEl) => {
            // PDF-only: fix layout + borders for export (Done page unchanged)
            clonedEl.style.width = `${REPORT_PDF_WIDTH}px`;
            clonedEl.style.minWidth = `${REPORT_PDF_WIDTH}px`;
            const cardsGrid = clonedEl.querySelector('[data-report-cards]');
            if (cardsGrid) {
              cardsGrid.style.display = 'grid';
              cardsGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
            }
            // Apply same border styling to all Paper cards (theme vars may not resolve in clone)
            // Prevent awkward mid-value line breaks in report rows (values wrap as whole units)
            clonedEl.querySelectorAll('[data-report-row]').forEach((el) => {
              el.style.flexWrap = 'wrap';
            });
            clonedEl.querySelectorAll('[data-report-value]').forEach((el) => {
              el.style.whiteSpace = 'nowrap';
            });

            const allPapers = clonedEl.querySelectorAll('[class*="MuiPaper"]');
            allPapers.forEach((paper) => {
              paper.style.boxShadow = 'none';
              paper.style.border = '1px solid #E5E7EB';
              const text = paper.textContent || '';
              const isTitleBanner = text.includes('HAIR TRANSPLANT');
              const isFirstStatCard = text.includes('TOTAL GRAFTS') && cardsGrid?.contains(paper);
              if (isTitleBanner || isFirstStatCard) {
                paper.style.backgroundColor = colors.brandBlue;
                paper.style.color = '#fff';
              }
            });
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(reportRef.current)
      .save()
      .then(() => setExporting(false))
      .catch(() => setExporting(false));
  }, [patient?.initials, surgery?.startedAt, surgery?.completedAt]);

  useEffect(() => {
    if (!onExportPdfReady) return;
    onExportPdfReady({ handleExportPdf, exporting });
    return () => onExportPdfReady(null);
  }, [onExportPdfReady, handleExportPdf, exporting]);

  const perfMetrics = [
    { key: 'graftCount', label: S.graftCount, fmt: (v) => v ?? 0 },
    { key: 'hairCount', label: S.hairCount, fmt: (v) => v ?? 0 },
    { key: 'potHair', label: S.potHair, fmt: (v) => v ?? 0 },
    { key: 'transRateHair', label: S.transRateHair, fmt: (v) => (v != null ? `${Number(v).toFixed(2)}%` : '0%') },
    { key: 'transRateGrafts', label: S.transRateGrafts, fmt: (v) => (v != null ? `${Number(v).toFixed(2)}%` : '0%') },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', p: 4, width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Box ref={reportRef} data-report-pdf>
      {/* Header: Clinic left, Logo right */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
              {company?.practiceName || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {company?.address || '—'}
            </Typography>
            {company?.phone && (
              <Typography variant="body2" color="text.secondary">Phone: {company.phone}</Typography>
            )}
            {company?.website && (
              <Typography variant="body2" color="text.secondary">{company.website}</Typography>
            )}
            {company?.email && (
              <Typography variant="body2" color="text.secondary">{company.email}</Typography>
            )}
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            {company?.logoUrl ? (
              <Box component="img" src={company.logoUrl} alt="" sx={{ maxHeight: 64, objectFit: 'contain' }} />
            ) : (
              <BrandLogo size="md" />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Full-width title card with primary background */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          width: '100%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 0.5, mb: 0.5 }}>
          {S.reportTitle}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.95 }}>
          Patient: {patient?.initials || '—'} | Date: {formatDate(surgery?.startedAt || surgery?.completedAt)}
        </Typography>
      </Paper>

      {/* Two-column: Patient Information | Surgery Details */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
        <Paper sx={{ flex: 1, minWidth: 280, p: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
            {S.patientInfo}
          </Typography>
          <ReportRow label="Patient ID" value={patient?.initials} />
          <ReportRow label="Date of Birth" value={formatDateMmDdYyyy(patient?.dob) || patient?.dob} />
          <ReportRow label="Hair Type" value={patient?.hairType} />
          <ReportRow label="Hair Color" value={patient?.hairColor} />
          <ReportRow label="Hair Caliber" value={patient?.hairCaliber} />
          <ReportRow label="Skin Color" value={patient?.skinColor} />
        </Paper>
        <Paper sx={{ flex: 1, minWidth: 280, p: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
            Surgery Details
          </Typography>
          <ReportRow label="Physician" value={surgical?.doctor ?? surgical?.surgeon} />
          <ReportRow label="Surgery Goal" value={surgery?.graftGoal} />
          <ReportRow label="FUE Device" value={surgical?.fueDevice} />
          <ReportRow label="Tip Style" value={surgical?.fueTipStyle} />
          <ReportRow label="Tip Size" value={surgical?.fueTipSize} />
          <ReportRow label="Holding Solution" value={surgical?.holdingSolution} />
          <ReportRow label="Placing Device" value={surgical?.placingDevice} />
        </Paper>
      </Box>

      {/* Five highlight cards - match in-progress style */}
      <Box data-report-cards sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: 'inherit' }}>{stats.totalGrafts ?? 0}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, color: 'inherit' }}>{S.totalGrafts}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} color="text.primary">{stats.totalHairs ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">{S.totalHairs}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} color="text.primary">{stats.singleGrafts ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">{S.singleGrafts}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            {stats.totalHairs ? `${(stats.hairTransectionRate * 100).toFixed(2)}%` : '0%'}
          </Typography>
          <Typography variant="caption" color="text.secondary">{S.transRateHair}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            {stats.totalGrafts ? `${(stats.graftTransectionRate * 100).toFixed(2)}%` : '0%'}
          </Typography>
          <Typography variant="caption" color="text.secondary">{S.transRateGrafts}</Typography>
        </Paper>
      </Box>

      {/* Three-column: Surgery Timing | Extraction Timing | Placing Timing */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
        <Paper sx={{ flex: 1, minWidth: 200, p: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
            Surgery Timing
          </Typography>
          <ReportRow label="Start Time" value={formatReportDateTime(surgery?.startedAt)} />
          <ReportRow label="Finish Time" value={formatReportDateTime(surgery?.completedAt)} />
          <ReportRow label="Total Sx Time" value={formatElapsedForReport(sxTotalMs)} />
        </Paper>
        <Paper sx={{ flex: 1, minWidth: 200, p: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
            Extraction Timing
          </Typography>
          <ReportRow label="Start" value={formatReportTime(surgery?.extraction?.startedAt)} />
          <ReportRow label="Finish" value={formatReportTime(surgery?.extraction?.completedAt)} />
          <ReportRow label="Total Time" value={formatElapsedForReport(extractionTotalMs)} />
        </Paper>
        <Paper sx={{ flex: 1, minWidth: 200, p: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
            Placing Timing
          </Typography>
          <ReportRow label="Start" value={formatReportTime(surgery?.placement?.startedAt)} />
          <ReportRow label="Finish" value={formatReportTime(surgery?.placement?.completedAt)} />
          <ReportRow label="Total Time" value={formatElapsedForReport(placementTotalMs)} />
        </Paper>
      </Box>

      {/* Graft Counting Summary by Technician */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 4, pb: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
            {S.graftCountingSummary}
          </Typography>
        </Box>
        <TableContainer sx={{ px: 4, pb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><Typography variant="body2" fontWeight={600} color="text.primary">Graft Type</Typography></TableCell>
                {techColumns.map((t) => (
                  <TableCell key={t.id || t.objectId} align="center"><Typography variant="body2" fontWeight={600} color="text.primary">{getTechnicianDisplayName(t)}</Typography></TableCell>
                ))}
                <TableCell align="right"><Typography variant="body2" fontWeight={600} color="text.primary">Total</Typography></TableCell>
              </TableRow>
            </TableHead>
              <TableBody>
                {(graftTypes.length ? graftTypes : entries.map((e) => e.label)).map((label) => {
                  const rowTotals = techColumns.map((t) => {
                    const tid = t.id || t.objectId;
                    return byTech.get(tid)?.get(label) ?? 0;
                  });
                  const total = rowTotals.reduce((s, n) => s + n, 0) || (entries.find((e) => e.label === label)?.count ?? 0);
                  return (
                    <TableRow key={label}>
                      <TableCell>{label}</TableCell>
                      {techColumns.map((t) => (
                        <TableCell key={t.id || t.objectId} align="center">{byTech.get(t.id || t.objectId)?.get(label) ?? ''}</TableCell>
                      ))}
                      <TableCell align="right"><Typography component="span" fontWeight={600}>{total}</Typography></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Technician Performance Summary */}
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 4, pb: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 2 }}>
              {S.technicianPerformanceSummary}
            </Typography>
          </Box>
          <TableContainer sx={{ px: 4, pb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell><Typography variant="body2" fontWeight={600} color="text.primary">Metric</Typography></TableCell>
                  {techColumns.map((t) => (
                    <TableCell key={t.id || t.objectId} align="center"><Typography variant="body2" fontWeight={600} color="text.primary">{getTechnicianDisplayName(t)}</Typography></TableCell>
                  ))}
                  <TableCell align="right"><Typography variant="body2" fontWeight={600} color="text.primary">Total</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {perfMetrics.map(({ key, label, fmt }) => {
                  const techVals = techColumns.map((tech) => {
                    const tid = tech.id || tech.objectId;
                    return technicianStats.get(tid)?.[key];
                  });
                  const totalVal = key === 'graftCount' ? (stats.totalGrafts ?? 0)
                    : key === 'hairCount' ? (stats.totalIntact ?? 0)
                    : key === 'potHair' ? (stats.totalHairs ?? 0)
                    : key === 'transRateHair' ? (stats.totalHairs ? stats.hairTransectionRate * 100 : 0)
                    : key === 'transRateGrafts' ? (stats.totalGrafts ? stats.graftTransectionRate * 100 : 0)
                    : 0;
                  return (
                    <TableRow key={key}>
                      <TableCell><Typography variant="body2" color="text.primary">{label}</Typography></TableCell>
                      {techColumns.map((tech) => (
                        <TableCell key={tech.id || tech.objectId} align="center">
                          <Typography variant="body2" color="text.primary">{fmt(technicianStats.get(tech.id || tech.objectId)?.[key])}</Typography>
                        </TableCell>
                      ))}
                      <TableCell align="right"><Typography variant="body2" fontWeight={600} color="text.primary">{fmt(totalVal)}</Typography></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Footer */}
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Report generated on: {formatReportDateTime(new Date().toISOString())}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {S.poweredBy}
          </Typography>
          <Typography variant="body2" component="div" sx={{ display: 'block', lineHeight: 1.3 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>SURG</Box>
            <Box component="span" sx={{ fontWeight: 400 }}> ASSIST</Box>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
            {S.byCaliforniaHairSurgeon}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function SurgeryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const adminCompany = useAdminCompany();
  const [surgery, setSurgery] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [options, setOptions] = useState({});
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [exportPdfApi, setExportPdfApi] = useState(null);

  /** Polling only — merges light fields into existing state. */
  const fetchSurgeryLight = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getSurgery(id, { light: '1' });
      setSurgery((prev) => {
        if (!data) return prev;
        if (!prev) return data;
        return {
          ...prev,
          ...data,
          patient: prev.patient ?? data.patient,
          graftButtons: prev.graftButtons ?? data.graftButtons,
        };
      });
    } catch (err) {
      console.error('Failed to fetch surgery', err);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setSurgery(null);
    (async () => {
      try {
        const lite = await getSurgery(id, { light: '1' });
        if (cancelled) return;
        setSurgery(lite);
        setLoading(false);

        const hydrated = await getSurgery(id, { omitGrafts: '1' });
        if (cancelled) return;
        setSurgery((prev) =>
          prev && hydrated
            ? { ...prev, ...hydrated, patient: hydrated.patient ?? prev.patient }
            : hydrated,
        );
      } catch (err) {
        console.error('Failed to fetch surgery', err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  usePollWhileVisible(fetchSurgeryLight, POLL_INTERVAL_MS);

  useEffect(() => {
    const params = adminCompany?.accountId ? { accountId: adminCompany.accountId } : {};
    getTechnicians(params).then(setTechnicians).catch(() => {});
  }, [adminCompany?.accountId]);

  useEffect(() => {
    const params = adminCompany?.accountId ? { accountId: adminCompany.accountId } : {};
    getDoctors(params).then(setDoctors).catch(() => setDoctors([]));
  }, [adminCompany?.accountId]);

  useEffect(() => {
    getOptions().then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    getSettings().then(setCompany).catch(() => {});
  }, []);

  const handleBack = () => navigate(-1);

  const handleStart = async () => {
    setStartError('');
    setStarting(true);
    try {
      const updated = await updateSurgery(id, {
        status: 'active',
        startedAt: new Date().toISOString(),
      });
      setSurgery(updated);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to start surgery';
      setStartError(msg);
      console.error('Failed to start surgery', err);
    } finally {
      setStarting(false);
    }
  };

  const handleTechniciansChange = async (technicianIds) => {
    const prevIds = surgery?.technicianIds ?? [];
    setSurgery((s) => ({ ...s, technicianIds })); // Optimistic update
    try {
      const updated = await updateSurgery(id, { technicianIds });
      setSurgery(updated);
    } catch (err) {
      console.error('Failed to update technicians', err);
      setSurgery((s) => ({ ...s, technicianIds: prevIds })); // Revert on failure
    }
  };

  const handleDoctorChange = async (doctorId, doctorName) => {
    try {
      const prev = surgery?.surgical || {};
      const surgical = { ...prev };
      if (doctorId) {
        surgical.doctorId = doctorId;
        surgical.doctor = doctorName;
        delete surgical.surgeonId;
        delete surgical.surgeon;
      } else {
        delete surgical.doctorId;
        delete surgical.doctor;
        delete surgical.surgeonId;
        delete surgical.surgeon;
      }
      const updated = await updateSurgery(id, { surgical });
      setSurgery(updated);
    } catch (err) {
      console.error('Failed to update doctor', err);
    }
  };

  const handleFieldSave = async (section, key, value) => {
    try {
      if (section === 'patient') {
        const patientId = typeof surgery?.patientId === 'string'
          ? surgery.patientId
          : (surgery?.patient?.id ?? surgery?.patientId?.objectId);
        if (!patientId) return;
        const updated = await updatePatient(patientId, { [key]: value });
        setSurgery((s) => ({
          ...s,
          patient: { ...(s.patient || {}), ...updated },
        }));
      } else if (section === 'surgical') {
        const surgical = { ...(surgery?.surgical || {}), [key]: value };
        const updated = await updateSurgery(id, { surgical });
        setSurgery(updated);
      } else if (section === 'surgery' && key === 'graftGoal') {
        const updated = await updateSurgery(id, { graftGoal: value ? Number(value) : null });
        setSurgery(updated);
      }
    } catch (err) {
      console.error('Failed to update field', err);
    }
  };

  const handleReport = () =>
    navigate({ pathname: location.pathname, search: '?report=1' });

  const handleComplete = async () => {
    try {
      const updated = await updateSurgery(id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      setSurgery(updated);
    } catch (err) {
      console.error('Failed to complete surgery', err);
    }
  };

  const status = surgery?.status;
  const notStarted = !status || status === 'pending' || !surgery?.startedAt;
  const inProgress = status === 'active';
  const done = status === 'completed';
  const extractionCompleted = !!surgery?.extraction?.completedAt;
  const placementCompleted = !!surgery?.placement?.completedAt;
  const canFinishSurgery = extractionCompleted && placementCompleted;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with back button and Start Surgery */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            onClick={handleBack}
            color="inherit"
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: 'none' }}
          >
            {S.back}
          </Button>
          {done && exportPdfApi && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdfIcon />}
              onClick={exportPdfApi.handleExportPdf}
              disabled={exportPdfApi.exporting}
              sx={{ textTransform: 'none' }}
            >
              {exportPdfApi.exporting ? 'Exporting…' : S.exportPdf}
            </Button>
          )}
        </Box>
        <Box sx={{ flex: 1 }} />
        {notStarted && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            {startError && (
              <Typography variant="body2" color="error">{startError}</Typography>
            )}
            <Button variant="contained" onClick={handleStart} disabled={starting}>
              {starting ? 'Starting…' : 'Start Surgery'}
            </Button>
          </Box>
        )}
        {inProgress && (
          <Button variant="contained" color="primary" onClick={handleComplete} disabled={!canFinishSurgery}>
            Finish Surgery
          </Button>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: done ? 'flex-start' : 'center' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} />
          </Box>
        ) : notStarted ? (
          <NotStartedState
            surgery={surgery}
            technicians={technicians}
            doctors={doctors}
            onTechniciansChange={handleTechniciansChange}
            onDoctorChange={handleDoctorChange}
            onFieldSave={handleFieldSave}
            options={options}
          />
        ) : inProgress ? (
          <InProgressState
            surgery={surgery}
            surgeryId={id}
            options={options}
            onUpdate={setSurgery}
            technicians={technicians}
            doctors={doctors}
            onTechniciansChange={handleTechniciansChange}
            onDoctorChange={handleDoctorChange}
            hidePatientEdit={!!adminCompany}
          />
        ) : done ? (
          <DoneState surgery={surgery} surgeryId={id} company={company} technicians={technicians} options={options} onReport={handleReport} onExportPdfReady={setExportPdfApi} />
        ) : (
          <NotStartedState
            surgery={surgery}
            technicians={technicians}
            doctors={doctors}
            onTechniciansChange={handleTechniciansChange}
            onDoctorChange={handleDoctorChange}
            onFieldSave={handleFieldSave}
            options={options}
          />
        )}
      </Box>
    </Box>
  );
}
