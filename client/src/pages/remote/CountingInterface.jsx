import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Typography, Paper, IconButton, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '../../hooks/useAuth';
import { getSurgery, getActivities, createActivity, updateActivity, deleteActivity, updateSurgery } from '../../api/surgeries';
import {
  getTechnicianStatsFromActivities,
  getTechnicianDisplayName,
  formatStartedAt,
  mergeSurgeryPatch,
  groupGraftButtonsByDenominatorRows,
  sortGraftButtonsByGraftType,
  getActivityExtractionBulkCount,
} from '../../utils/surgery';
import { triggerLightHaptic } from '../../utils/haptics';
import EditTechnicianButtonsModal from '../../components/EditTechnicianButtonsModal';
import BulkAddModal from '../../components/BulkAddModal';
import BulkQuantityKeypad, { BULK_QUANTITY_MAX } from '../../components/BulkQuantityKeypad';
import S, { format } from '../../strings';

const LONG_PRESS_MS = 500;
/** Only while waiting for the doctor to start — same visibility rules as usePollWhileVisible. */
const POLL_MS_PENDING_START = 4000;

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

function getActiveButtons(graftButtons, technicianConfig) {
  if (!graftButtons?.length) return [];
  let list;
  if (technicianConfig?.labels?.length) {
    const set = new Set(technicianConfig.labels);
    list = graftButtons.filter((b) => set.has(b.label));
  } else {
    const defaults = graftButtons.filter((b) => b.isDefault);
    list = defaults.length ? defaults : [...graftButtons];
  }
  return list;
}

function toUserId(ref) {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref?.objectId ?? ref?.id ?? null;
}

function graftButtonKey(btn, rowIndex = 0, colIndex = 0) {
  const id = btn?.id || btn?.objectId;
  if (id) return String(id);
  return `${rowIndex}-${colIndex}-${btn?.label ?? ''}`;
}

/** Dimmed opacity while pending server; must match keyframe end state for slide-in. */
const ACTIVITY_OPTIMISTIC_OPACITY = 0.48;
/** Smooth fade when a row leaves optimistic state (and for any opacity change). */
const ACTIVITY_OPACITY_TRANSITION = 'opacity 0.25s ease-in-out';

export default function CountingInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [surgery, setSurgery] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editButtonsOpen, setEditButtonsOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalInitialLabel, setBulkModalInitialLabel] = useState('');
  const [activityModal, setActivityModal] = useState(null);
  const [activityEditLabel, setActivityEditLabel] = useState('');
  const [activityEditCountStr, setActivityEditCountStr] = useState('');
  const [activityEditError, setActivityEditError] = useState('');
  const [activityUpdating, setActivityUpdating] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressConsumedRef = useRef(false);

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

  /** Light refresh — updates status/startedAt when doctor starts the case (full graft list kept from initial load). */
  const pollSurgeryLight = useCallback(async () => {
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
      console.error('Failed to refresh surgery', err);
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

  const surgeryPendingStart =
    surgery != null &&
    surgery.status !== 'active' &&
    surgery.status !== 'completed';

  useEffect(() => {
    if (!surgeryPendingStart) return undefined;
    let timer = null;
    const tick = () => pollSurgeryLight();
    const arm = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        timer = setInterval(tick, POLL_MS_PENDING_START);
      }
    };
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        if (timer) clearInterval(timer);
        timer = null;
      } else {
        tick();
        arm();
      }
    };
    arm();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [surgeryPendingStart, pollSurgeryLight]);

  useEffect(() => {
    if (!activityModal) {
      setActivityUpdating(false);
      return;
    }
    setActivityEditLabel(activityModal.payload?.label ?? '');
    setActivityEditCountStr(String(getActivityExtractionBulkCount(activityModal.payload)));
    setActivityEditError('');
  }, [activityModal]);

  const graftButtons = surgery?.graftButtons ?? [];
  const myUserId = user?.id || user?.objectId;
  const techConfig = (surgery?.technicianButtonConfigs || []).find(
    (c) => toUserId(c.userId) === myUserId
  );
  const activeButtons = getActiveButtons(graftButtons, techConfig);
  const buttonRows = groupGraftButtonsByDenominatorRows(activeButtons);
  const graftButtonsSorted = sortGraftButtonsByGraftType(graftButtons);
  const technicianStats = getTechnicianStatsFromActivities(activities);
  const myStats = technicianStats.get(user?.id || user?.objectId) || {};
  const extractionCompleted = !!surgery?.extraction?.completedAt;

  const handleBack = () => navigate('/remote/surgeries');

  const handleButtonClick = async (btn) => {
    if (!id || surgeryPendingStart || extractionCompleted) return;
    triggerLightHaptic();

    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nowIso = new Date().toISOString();
    const payload = {
      label: btn.label,
      intactHairs: btn.intactHairs ?? 0,
      totalHairs: btn.totalHairs ?? 1,
    };
    const optimisticActivity = {
      id: optimisticId,
      objectId: optimisticId,
      _clientKey: optimisticId,
      action: 'extraction',
      payload,
      createdAt: nowIso,
      userId: myUserId,
      user: {
        id: myUserId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        username: user?.username,
      },
      _optimistic: true,
    };

    setActivities((prev) => [optimisticActivity, ...prev]);

    try {
      const res = await createActivity(id, {
        action: 'extraction',
        payload,
      });
      if (res.surgery) setSurgery((prev) => mergeSurgeryPatch(prev, res.surgery));
      const serverAct = res.activity;
      if (serverAct) {
        const rid = serverAct.id || serverAct.objectId;
        const newActivity = {
          ...serverAct,
          _clientKey: optimisticId,
          user: {
            id: myUserId,
            firstName: user?.firstName,
            lastName: user?.lastName,
            username: user?.username,
          },
          userId: myUserId,
          action: 'extraction',
          _optimistic: false,
        };
        setActivities((prev) => {
          const without = prev.filter((a) => {
            const aid = a.id || a.objectId;
            return aid !== optimisticId && aid !== rid;
          });
          return [newActivity, ...without];
        });
      } else {
        await fetchActivities();
      }
    } catch (err) {
      console.error('Failed to create activity', err);
      setActivities((prev) => prev.filter((a) => (a.id || a.objectId) !== optimisticId));
    }
  };

  const handleActivityConfirm = async () => {
    if (!activityModal || !id) return;
    setActivityEditError('');
    const n = parseInt(activityEditCountStr, 10);
    if (Number.isNaN(n) || n < 1) {
      setActivityEditError(S.bulkAddInvalidCount);
      return;
    }
    if (n > BULK_QUANTITY_MAX) {
      setActivityEditError(format(S.bulkAddMaxCount, { max: BULK_QUANTITY_MAX }));
      return;
    }
    const btn = graftButtons.find((b) => b.label === activityEditLabel);
    if (!btn) {
      setActivityEditError(S.bulkAddSelectType);
      return;
    }
    try {
      setActivityUpdating(true);
      const aid = activityModal.id || activityModal.objectId;
      const patch = {
        label: btn.label,
        intactHairs: btn.intactHairs ?? 0,
        totalHairs: btn.totalHairs ?? 1,
        ...(n > 1 ? { count: n } : {}),
      };
      const { surgery: updated } = await updateActivity(id, aid, patch);
      setSurgery((prev) => mergeSurgeryPatch(prev, updated));
      fetchActivities();
      setActivityModal(null);
    } catch (err) {
      console.error('Failed to update activity', err);
      setActivityEditError(S.bulkAddFailed);
    } finally {
      setActivityUpdating(false);
    }
  };

  const handleActivityDelete = async () => {
    if (!activityModal || !id || activityUpdating) return;
    try {
      setActivityUpdating(true);
      const aid = activityModal.id || activityModal.objectId;
      const { surgery: updated } = await deleteActivity(id, aid);
      setSurgery((prev) => mergeSurgeryPatch(prev, updated));
      fetchActivities();
      setActivityModal(null);
    } catch (err) {
      console.error('Failed to delete activity', err);
    } finally {
      setActivityUpdating(false);
    }
  };

  const handleSaveButtonConfig = async (labels) => {
    if (!id) return;
    const configs = (surgery?.technicianButtonConfigs || []).filter(
      (c) => toUserId(c.userId) !== myUserId
    );
    configs.push({ userId: myUserId, labels });
    const updated = await updateSurgery(id, { technicianButtonConfigs: configs });
    setSurgery((prev) => mergeSurgeryPatch(prev, updated));
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleGraftPointerDown = (btn) => () => {
    if (surgeryPendingStart || extractionCompleted) return;
    longPressConsumedRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressConsumedRef.current = true;
      triggerLightHaptic();
      setBulkModalInitialLabel(btn.label);
      setBulkModalOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleGraftPointerUp = (btn) => () => {
    clearLongPressTimer();
    if (surgeryPendingStart || extractionCompleted) return;
    if (longPressConsumedRef.current) {
      longPressConsumedRef.current = false;
      return;
    }
    handleButtonClick(btn);
  };

  const handleGraftPointerLeave = () => {
    clearLongPressTimer();
  };

  const handleBulkSave = async (count, btn) => {
    if (!id || surgeryPendingStart || extractionCompleted) {
      throw new Error('skip');
    }
    triggerLightHaptic();
    const payload = {
      label: btn.label,
      intactHairs: btn.intactHairs ?? 0,
      totalHairs: btn.totalHairs ?? 1,
      count,
    };
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nowIso = new Date().toISOString();
    const optimisticActivity = {
      id: optimisticId,
      objectId: optimisticId,
      _clientKey: optimisticId,
      action: 'extraction',
      payload,
      createdAt: nowIso,
      userId: myUserId,
      user: {
        id: myUserId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        username: user?.username,
      },
      _optimistic: true,
    };
    setActivities((prev) => [optimisticActivity, ...prev]);

    try {
      const res = await createActivity(id, {
        action: 'extraction',
        payload,
      });
      if (res?.surgery) setSurgery((prev) => mergeSurgeryPatch(prev, res.surgery));
      const serverAct = res?.activity;
      if (serverAct) {
        const rid = serverAct.id || serverAct.objectId;
        const newActivity = {
          ...serverAct,
          _clientKey: optimisticId,
          user: optimisticActivity.user,
          userId: myUserId,
          action: 'extraction',
          _optimistic: false,
        };
        setActivities((prev) => {
          const without = prev.filter((a) => {
            const aid = a.id || a.objectId;
            return aid !== optimisticId && aid !== rid;
          });
          return [newActivity, ...without];
        });
      } else {
        await fetchActivities();
      }
    } catch (err) {
      console.error('Bulk add failed', err);
      setActivities((prev) => prev.filter((a) => (a.id || a.objectId) !== optimisticId));
      throw err;
    }
  };

  const myActivities = activities.filter((a) => {
    if (a.action !== 'extraction') return false;
    const aid = a.userId?.id ?? a.userId?.objectId ?? (typeof a.userId === 'string' ? a.userId : null) ?? a.user?.id;
    return aid === myUserId;
  });

  if (loading || !surgery) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  const patientLabel = `${surgery?.patient?.initials || '—'} ${surgery?.startedAt ? formatStartedAt(surgery.startedAt).split(' | ')[1] || '' : ''}`.trim();

  return (
    <Box
      sx={{
        height: '100dvh',
        maxHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            disabled={surgeryPendingStart || extractionCompleted || activeButtons.length === 0}
            onClick={() => {
              setBulkModalInitialLabel('');
              setBulkModalOpen(true);
            }}
            sx={{ textTransform: 'none' }}
          >
            {S.bulkAdd}
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => setEditButtonsOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            {S.editButtons}
          </Button>
        </Box>
      </Box>

      {/* Main content: buttons + summary/activity; column on small screens so 4 graft buttons can use full width */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden',
        }}
      >
        {/* Left: graft buttons — 4 columns per row; container for min-height = 4 square rows */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            p: { xs: 1.5, sm: 2, md: 4 },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          {surgeryPendingStart && (
            <Alert severity="info" sx={{ width: '100%', maxWidth: 560, mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700}>{S.techDashWaitForStartTitle}</Typography>
              <Typography variant="body2">{S.techDashWaitForStartBody}</Typography>
            </Alert>
          )}
          {activeButtons.length === 0 ? (
            <Typography color="text.secondary">{S.techEditButtonsConfigureHint}</Typography>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 1, sm: 1.25, md: 1.5 },
                width: '100%',
                maxWidth: '100%',
                flex: 1,
                minHeight: 0,
              }}
            >
              {buttonRows.map((row, ri) => (
                <Box
                  key={ri}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gridTemplateRows: 'minmax(0, 1fr)',
                    gap: { xs: 1, sm: 1.5, md: 2 },
                    width: '100%',
                  }}
                >
                  {row.map((btn, bi) => (
                    <Button
                      key={graftButtonKey(btn, ri, bi)}
                      variant="contained"
                      color="primary"
                      disabled={surgeryPendingStart || extractionCompleted}
                      onPointerDown={handleGraftPointerDown(btn)}
                      onPointerUp={handleGraftPointerUp(btn)}
                      onPointerLeave={handleGraftPointerLeave}
                      onPointerCancel={handleGraftPointerLeave}
                      sx={{
                        minWidth: 0,
                        width: '100%',
                        height: '100%',
                        minHeight: 0,
                        alignSelf: 'stretch',
                        justifySelf: 'stretch',
                        p: { xs: 0.5, sm: 0.75 },
                        fontSize: 'clamp(0.85rem, 4vmin, 3rem)',
                        fontWeight: 700,
                        borderRadius: 2,
                        lineHeight: 1.1,
                        transition: 'opacity 0.07s ease, transform 0.07s ease',
                        willChange: 'opacity, transform',
                        '&:active': {
                          opacity: 0.82,
                          transform: 'scale(0.97)',
                        },
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

        {/* Right: Summary + Activity — scrolls vertically; full width when stacked below buttons */}
        <Box
          sx={{
            width: { xs: '100%', md: 320 },
            flexShrink: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 2,
            bgcolor: 'background.default',
            maxHeight: { xs: '42vh', md: 'none' },
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Paper sx={{ p: 2, flexShrink: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
              {S.techDashSummary}
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
              {S.techDashActivity}
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
                '@keyframes activityRowSlideIn': {
                  from: { opacity: 0, transform: 'translateY(-10px)' },
                  to: {
                    opacity: ACTIVITY_OPTIMISTIC_OPACITY,
                    transform: 'translateY(0)',
                  },
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
                    key={a._clientKey ?? a.id ?? a.objectId ?? `${a.payload?.label}-${a.createdAt}`}
                    dense
                    onClick={() =>
                      a.action === 'extraction' &&
                      !surgeryPendingStart &&
                      !extractionCompleted &&
                      !a._optimistic &&
                      setActivityModal(a)}
                    sx={{
                      cursor:
                        a.action === 'extraction' &&
                        !surgeryPendingStart &&
                        !extractionCompleted &&
                        !a._optimistic
                          ? 'pointer'
                          : 'default',
                      py: 0.5,
                      px: 0,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      transition: ACTIVITY_OPACITY_TRANSITION,
                      ...(a._optimistic
                        ? {
                            animation: 'activityRowSlideIn 0.22s ease-out forwards',
                          }
                        : {
                            animation: 'none',
                            opacity: 1,
                          }),
                      '&:hover':
                        a.action === 'extraction' &&
                        !surgeryPendingStart &&
                        !extractionCompleted &&
                        !a._optimistic
                          ? { bgcolor: 'action.hover' }
                          : {},
                    }}
                    secondaryAction={
                      (() => {
                        const bulkUnits = getActivityExtractionBulkCount(a.payload);
                        const showMenu =
                          !surgeryPendingStart &&
                          !a._optimistic &&
                          a.action === 'extraction' &&
                          !extractionCompleted;
                        if (bulkUnits <= 1 && !showMenu) return null;
                        return (
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', height: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bulkUnits > 1 && (
                              <Typography
                                component="span"
                                variant="body2"
                                fontWeight={700}
                                color="text.secondary"
                                sx={{
                                  fontVariantNumeric: 'tabular-nums',
                                  pr: showMenu ? 0.25 : 0,
                                  userSelect: 'none',
                                }}
                              >
                                {format(S.activityBulkMultiplier, { count: bulkUnits })}
                              </Typography>
                            )}
                            {showMenu && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivityModal(a);
                                }}
                                aria-label={S.correctGraftType}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        );
                      })()
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
                              display: 'inline-flex',
                              alignItems: 'baseline',
                            }}
                          >
                            {(a.payload?.label ?? a.action).split('/').map((part, i) => (
                              <Box key={i} component="span">
                                {i > 0 && (
                                  <Box component="span" sx={{ opacity: 0.5 }}>
                                    /
                                  </Box>
                                )}
                                {part}
                              </Box>
                            ))}
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

      {/* Activity edit modal — quantity keypad + graft type (same layout as bulk add) */}
      <Dialog
        open={!!activityModal}
        onClose={() => !activityUpdating && setActivityModal(null)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: '90vw',
            height: '90vh',
            maxWidth: 'none',
            maxHeight: 'none',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {S.correctGraftType}
          <IconButton onClick={() => !activityUpdating && setActivityModal(null)} size="small" aria-label={S.cancel}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, pt: 2 }}>
          {activityModal && (
            <>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                  minHeight: 0,
                }}
              >
                <Box
                  sx={{
                    flex: '0 0 auto',
                    width: { xs: '100%', md: '38%' },
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <BulkQuantityKeypad
                    countStr={activityEditCountStr}
                    onCountChange={(s) => {
                      setActivityEditCountStr(s);
                      setActivityEditError('');
                    }}
                    disabled={activityUpdating}
                  />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: { md: 1 },
                    borderTop: { xs: 1, md: 0 },
                    borderColor: 'divider',
                    pl: { md: 3 },
                    pt: { xs: 2, md: 0 },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>
                    {S.graftType}
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      overflow: 'auto',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignContent: 'flex-start',
                      gap: 2,
                    }}
                  >
                    {(graftButtonsSorted || []).map((btn, i) => (
                      <Chip
                        key={graftButtonKey(btn, 0, i)}
                        label={btn.label}
                        onClick={() => {
                          setActivityEditLabel(btn.label);
                          setActivityEditError('');
                        }}
                        color={activityEditLabel === btn.label ? 'primary' : 'default'}
                        variant={activityEditLabel === btn.label ? 'filled' : 'outlined'}
                        disabled={activityUpdating}
                        sx={{
                          cursor: 'pointer',
                          fontSize: '1.5rem',
                          minHeight: 48,
                          '& .MuiChip-label': { px: 2 },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
              {activityEditError && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                  {activityEditError}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <Divider />
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Button color="error" onClick={handleActivityDelete} disabled={activityUpdating}>
            {S.delete}
          </Button>
          <Button variant="contained" onClick={handleActivityConfirm} disabled={activityUpdating}>
            {S.update}
          </Button>
        </DialogActions>
      </Dialog>

      <BulkAddModal
        open={bulkModalOpen}
        onClose={() => {
          setBulkModalOpen(false);
          setBulkModalInitialLabel('');
        }}
        buttons={sortGraftButtonsByGraftType(activeButtons)}
        initialLabel={bulkModalInitialLabel}
        onSave={handleBulkSave}
      />

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
