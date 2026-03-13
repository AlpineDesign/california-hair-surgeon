import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '../../hooks/useAuth';
import { getSurgery, getActivities, createActivity, updateActivity, deleteActivity, updateSurgery } from '../../api/surgeries';
import {
  getTechnicianStatsFromActivities,
  getTechnicianDisplayName,
  formatStartedAt,
} from '../../utils/surgery';
import EditTechnicianButtonsModal from '../../components/EditTechnicianButtonsModal';
import S from '../../strings';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

function getActiveButtons(graftButtons, technicianConfig) {
  if (!graftButtons?.length) return [];
  if (technicianConfig?.labels?.length) {
    const set = new Set(technicianConfig.labels);
    return graftButtons.filter((b) => set.has(b.label));
  }
  const defaults = graftButtons.filter((b) => b.isDefault);
  return defaults.length ? defaults : graftButtons;
}

function toUserId(ref) {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref?.objectId ?? ref?.id ?? null;
}

function arrangeButtonsTriangular(buttons) {
  const rows = [];
  let idx = 0;
  for (let r = 1; idx < buttons.length; r++) {
    rows.push(buttons.slice(idx, idx + r));
    idx += r;
  }
  if (idx < buttons.length) rows.push(buttons.slice(idx));
  return rows;
}

export default function CountingInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [surgery, setSurgery] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editButtonsOpen, setEditButtonsOpen] = useState(false);
  const [activityModal, setActivityModal] = useState(null);

  const fetchSurgery = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getSurgery(id);
      setSurgery(data);
    } catch (err) {
      console.error('Failed to fetch surgery', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getActivities(id);
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    }
  }, [id]);

  useEffect(() => { fetchSurgery(); }, [fetchSurgery]);
  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const graftButtons = surgery?.graftButtons ?? [];
  const myUserId = user?.id || user?.objectId;
  const techConfig = (surgery?.technicianButtonConfigs || []).find(
    (c) => toUserId(c.userId) === myUserId
  );
  const activeButtons = getActiveButtons(graftButtons, techConfig);
  const buttonRows = arrangeButtonsTriangular(activeButtons);
  const technicianStats = getTechnicianStatsFromActivities(activities);
  const myStats = technicianStats.get(user?.id || user?.objectId) || {};

  const handleBack = () => navigate('/remote/surgeries');

  const handleButtonClick = async (btn) => {
    if (!id) return;
    try {
      const res = await createActivity(id, {
        action: 'extraction',
        payload: { label: btn.label, intactHairs: btn.intactHairs ?? 0, totalHairs: btn.totalHairs ?? 1 },
      });
      if (res.surgery) setSurgery(res.surgery);
      if (res.activity) {
        const newActivity = { ...res.activity, user: { id: myUserId }, userId: myUserId, action: 'extraction' };
        setActivities((prev) => [newActivity, ...prev.filter((a) => (a.id || a.objectId) !== (res.activity?.id || res.activity?.objectId))]);
      }
      await fetchActivities();
    } catch (err) {
      console.error('Failed to create activity', err);
    }
  };

  const handleActivityEdit = async (newLabel) => {
    if (!activityModal || !id) return;
    const btn = graftButtons.find((b) => b.label === newLabel);
    if (!btn) return;
    try {
      const { surgery: updated } = await updateActivity(id, activityModal.id, {
        label: btn.label,
        intactHairs: btn.intactHairs,
        totalHairs: btn.totalHairs,
      });
      setSurgery(updated);
      fetchActivities();
      setActivityModal(null);
    } catch (err) {
      console.error('Failed to update activity', err);
    }
  };

  const handleActivityDelete = async () => {
    if (!activityModal || !id) return;
    try {
      const { surgery: updated } = await deleteActivity(id, activityModal.id);
      setSurgery(updated);
      fetchActivities();
      setActivityModal(null);
    } catch (err) {
      console.error('Failed to delete activity', err);
    }
  };

  const handleSaveButtonConfig = async (labels) => {
    if (!id) return;
    const configs = (surgery?.technicianButtonConfigs || []).filter(
      (c) => toUserId(c.userId) !== myUserId
    );
    configs.push({ userId: myUserId, labels });
    try {
      const result = await updateSurgery(id, { technicianButtonConfigs: configs });
      setSurgery(result);
      setEditButtonsOpen(false);
    } catch (err) {
      console.error('Failed to save button config', err);
    }
  };

  const extractionCompleted = !!surgery?.extraction?.completedAt;
  const placementCompleted = !!surgery?.placement?.completedAt;
  const myActivities = activities.filter((a) => {
    const aid = a.userId?.id ?? a.userId?.objectId ?? (typeof a.userId === 'string' ? a.userId : null) ?? a.user?.id;
    return aid === myUserId;
  });

  if (loading || !surgery) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  const patientLabel = `${surgery?.patient?.initials || '—'} ${surgery?.startedAt ? formatStartedAt(surgery.startedAt).split(' | ')[1] || '' : ''}`.trim();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header — same spacing as surgical dashboard */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
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
            Back
          </Button>
          <Typography variant="h6" fontWeight={600}>
            {patientLabel}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={() => setEditButtonsOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          {S.editButtons}
        </Button>
      </Box>

      {/* Main content: buttons left, summary + activity right */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Giant buttons grid — scrolls vertically */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            p: 4,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          {activeButtons.length === 0 ? (
            <Typography color="text.secondary">No graft buttons configured. Ask your account owner to add them in Settings.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
              {buttonRows.map((row, ri) => (
                <Box key={ri} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-start' }}>
                  {row.map((btn) => (
                    <Button
                      key={btn.label}
                      variant="contained"
                      color="primary"
                      disabled={extractionCompleted}
                      onClick={() => handleButtonClick(btn)}
                      sx={{
                        minWidth: 175,
                        height: 175,
                        fontSize: '3.2rem',
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                    >
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
                        {btn.label.split('/').map((part, i) => (
                          <Box key={i} component="span">
                            {i > 0 && <Box component="span" sx={{ opacity: 0.5 }}>/</Box>}
                            {part}
                          </Box>
                        ))}
                      </Box>
                    </Button>
                  ))}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Right: Summary + Activity — scrolls vertically */}
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 2,
            bgcolor: 'background.default',
            borderLeft: 1,
            borderColor: 'divider',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Paper sx={{ p: 2, flexShrink: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
              Summary
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{S.graftCount}</Typography>
                <Typography variant="body2" fontWeight={700}>{myStats.graftCount ?? 0}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{S.hairCount}</Typography>
                <Typography variant="body2" fontWeight={700}>{myStats.hairCount ?? 0}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{S.potHair}</Typography>
                <Typography variant="body2" fontWeight={700}>{myStats.potHair ?? 0}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{S.transRateHair}</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {myStats.transRateHair != null ? `${myStats.transRateHair.toFixed(2)}` : '0'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{S.transRateGrafts}</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {myStats.transRateGrafts != null ? `${myStats.transRateGrafts.toFixed(2)}` : '0'}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ px: 2, pt: 2, pb: 1 }}>
              Activity
            </Typography>
            <List
              dense
              sx={{
                flex: 1,
                overflow: 'auto',
                py: 0,
                pl: 2,
                pr: 0.5,
                pb: 2,
                '@keyframes slideIn': {
                  from: { opacity: 0, transform: 'translateY(-12px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              {myActivities.length === 0 ? (
                <ListItem>
                  <ListItemText primary={S.noActivity} secondary={S.noActivitySecondary} />
                </ListItem>
              ) : (
                myActivities.map((a) => (
                  <ListItem
                    key={a.id ?? a.objectId ?? `${a.payload?.label}-${a.createdAt}`}
                    dense
                    onClick={() => a.action === 'extraction' && !extractionCompleted && setActivityModal(a)}
                    sx={{
                      cursor: a.action === 'extraction' && !extractionCompleted ? 'pointer' : 'default',
                      py: 0.5,
                      px: 0,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      animation: 'slideIn 0.25s ease-out',
                      '&:hover': a.action === 'extraction' && !extractionCompleted ? { bgcolor: 'action.hover' } : {},
                    }}
                    secondaryAction={
                      a.action === 'extraction' && !extractionCompleted && (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setActivityModal(a); }}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            component="span"
                            sx={{
                              px: 0.75,
                              py: 0.25,
                              bgcolor: 'grey.200',
                              border: '1px solid',
                              borderColor: 'grey.600',
                              borderRadius: 0.5,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'grey.800',
                            }}
                          >
                            {a.payload?.label ?? a.action}
                          </Box>
                          {formatTime(a.createdAt)}
                        </Box>
                      }
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Box>
      </Box>

      {/* Activity edit modal — pill list + delete */}
      <Dialog open={!!activityModal} onClose={() => setActivityModal(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{S.correctGraftType}</DialogTitle>
        <DialogContent>
          {activityModal && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              {(graftButtons || []).map((btn) => (
                <Chip
                  key={btn.label}
                  label={btn.label}
                  onClick={() => handleActivityEdit(btn.label)}
                  color={activityModal.payload?.label === btn.label ? 'primary' : 'default'}
                  variant={activityModal.payload?.label === btn.label ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    minHeight: 48,
                    '& .MuiChip-label': { px: 2 },
                  }}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', alignItems: 'stretch' }}>
          <Button color="error" onClick={handleActivityDelete} sx={{ order: 2 }}>
            {S.remove}
          </Button>
          <Button onClick={() => setActivityModal(null)}>{S.cancel}</Button>
        </DialogActions>
      </Dialog>

      {editButtonsOpen && (
        <EditTechnicianButtonsModal
          open
          onClose={() => setEditButtonsOpen(false)}
          graftButtons={graftButtons}
          selectedLabels={activeButtons.map((b) => b.label)}
          onSave={handleSaveButtonConfig}
        />
      )}
    </Box>
  );
}
