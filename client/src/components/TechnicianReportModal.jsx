import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton,
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
  Skeleton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../hooks/useAuth';
import { getActivities } from '../api/surgeries';
import {
  getTechnicianStatsFromActivities,
  getTechnicianStatsRowForUser,
  getMapValueForUser,
  getGraftCountsByTechnician,
  getExtractionCountsByLabel,
  getGraftTypeLabelsForReport,
  getTechnicianDisplayName,
} from '../utils/surgery';
import S from '../strings';

/**
 * Modal showing report stats for the current technician only.
 * Displays Graft Counting Summary and Technician Performance Summary filtered to the current user.
 */
export default function TechnicianReportModal({ surgery, open, onClose }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const surgeryId = surgery?.id || surgery?.objectId;

  useEffect(() => {
    if (!open || !surgeryId) return;
    setActivitiesLoading(true);
    getActivities(surgeryId)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setActivitiesLoading(false));
  }, [open, surgeryId]);

  const graftButtons = surgery?.graftButtons ?? [];
  const { byTech, graftTypes } = getGraftCountsByTechnician(activities, graftButtons);
  const technicianStats = getTechnicianStatsFromActivities(activities);
  const entries = surgery?.extraction?.entries ?? [];
  const extractionCountByLabel = getExtractionCountsByLabel(activities);
  const graftTypesList = getGraftTypeLabelsForReport(graftTypes, entries, extractionCountByLabel);

  const techData = getTechnicianStatsRowForUser(technicianStats, user);
  const graftData = getMapValueForUser(byTech, user);

  const perfMetrics = [
    { key: 'graftCount', label: S.graftCount, fmt: (v) => v ?? 0 },
    { key: 'hairCount', label: S.hairCount, fmt: (v) => v ?? 0 },
    { key: 'potHair', label: S.potHair, fmt: (v) => v ?? 0 },
    { key: 'transRateHair', label: S.transRateHair, fmt: (v) => (v != null ? `${Number(v).toFixed(2)}%` : '0%') },
    { key: 'transRateGrafts', label: S.transRateGrafts, fmt: (v) => (v != null ? `${Number(v).toFixed(2)}%` : '0%') },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {S.report} — {getTechnicianDisplayName(user)}
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close"
          sx={{ ml: 1 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Graft Counting Summary */}
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                {S.graftCountingSummary}
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><Typography variant="body2" fontWeight={600}>Graft Type</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={600}>{getTechnicianDisplayName(user)}</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activitiesLoading ? (
                    [1, 2, 3, 4, 5, 6].map((i) => (
                      <TableRow key={`g-${i}`}>
                        <TableCell><Skeleton variant="text" width={72} /></TableCell>
                        <TableCell align="right"><Skeleton variant="text" width={40} sx={{ ml: 'auto' }} /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    graftTypesList.map((label) => (
                      <TableRow key={label}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right">{graftData?.get(label) ?? ''}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Technician Performance Summary */}
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                {S.technicianPerformanceSummary}
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><Typography variant="body2" fontWeight={600}>Metric</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={600}>{getTechnicianDisplayName(user)}</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activitiesLoading ? (
                    perfMetrics.map(({ key, label }) => (
                      <TableRow key={`p-${key}`}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right"><Skeleton variant="text" width={56} sx={{ ml: 'auto' }} /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    perfMetrics.map(({ key, label, fmt }) => (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={key.startsWith('trans') ? 600 : 400}>
                            {fmt(techData?.[key])}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
