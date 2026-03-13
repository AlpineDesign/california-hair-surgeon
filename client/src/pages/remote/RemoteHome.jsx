import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Link as MuiLink, Tabs, Tab,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getSurgeries } from '../../api/surgeries';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { getTotalGrafts, getGoalPct, formatDateTime } from '../../utils/surgery';
import TechnicianReportModal from '../../components/TechnicianReportModal';
import S from '../../strings';

const POLL_INTERVAL_MS = 5000;

function getGreeting(firstName) {
  const hour = new Date().getHours();
  const time = hour < 12 ? S.goodMorning : hour < 17 ? S.goodAfternoon : S.goodEvening;
  return `${time}${firstName ? ` ${firstName}` : ''}`;
}

const ACTIVE_COLS = [S.patient, S.extractionStarted, S.placingStarted, S.grafts, ''];

function ActiveSurgeriesTable({ surgeries, loading, basePath }) {
  if (loading) {
    return (
      <TableContainer>
        <Table size="small">
          <TableBody><TableLoader colSpan={ACTIVE_COLS.length} /></TableBody>
        </Table>
      </TableContainer>
    );
  }
  if (!surgeries.length) {
    return <EmptyState icon={<MedicalServicesIcon />} message={S.emptyActiveSurgeries} />;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {ACTIVE_COLS.map((h) => (
              <TableCell key={h}>
                <Typography variant="caption" color="text.secondary">{h}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {surgeries.map((s) => (
            <TableRow key={s.id || s.objectId} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight={600}>{s.patient?.initials || '—'}</Typography>
                  <StatusBadge status={s.status} />
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatDateTime(s.extraction?.startedAt)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatDateTime(s.placement?.startedAt)}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 260 }}>
                <GraftProgressBar current={getTotalGrafts(s)} goal={s.graftGoal ?? 0} />
              </TableCell>
              <TableCell align="right">
                <MuiLink component={Link} to={`${basePath}/${s.id || s.objectId}`} variant="body2" fontWeight={600}>
                  {S.dashboard}
                </MuiLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const UPCOMING_PAST_COLS = [S.patient, S.date, S.grafts, S.goal, S.actions];

function SurgeriesTable({ surgeries, emptyMessage, showReport, basePath, onReport }) {
  if (!surgeries.length) {
    return <EmptyState icon={<MedicalServicesIcon />} message={emptyMessage} />;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {UPCOMING_PAST_COLS.map((h) => (
              <TableCell key={h}>
                <Typography variant="caption" color="text.secondary">{h}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {surgeries.map((s) => (
            <TableRow key={s.id || s.objectId} hover>
              <TableCell>
                <Typography variant="body1" fontWeight={600}>{s.patient?.initials || '—'}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatDateTime(s.startedAt || s.createdAt)}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 260 }}>
                <GraftProgressBar current={getTotalGrafts(s)} goal={s.graftGoal ?? 0} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>{getGoalPct(s)}</Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {showReport && s.status === 'completed' && (
                    <MuiLink
                      component="button"
                      variant="body2"
                      fontWeight={600}
                      onClick={() => onReport(s)}
                      sx={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                    >
                      {S.report}
                    </MuiLink>
                  )}
                  <MuiLink component={Link} to={`${basePath}/${s.id || s.objectId}`} variant="body2" fontWeight={600}>
                    {S.dashboard}
                  </MuiLink>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function RemoteHome() {
  const { user } = useAuth();
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [reportSurgery, setReportSurgery] = useState(null);

  const fetchSurgeries = useCallback(async () => {
    try {
      const data = await getSurgeries();
      setSurgeries(data);
    } catch (err) {
      console.error('Failed to fetch surgeries', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurgeries();
    const interval = setInterval(fetchSurgeries, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSurgeries]);

  const basePath = '/remote/surgeries';
  const active = surgeries.filter((s) => s.status === 'active');
  const past = surgeries.filter((s) => s.status === 'completed');
  const upcoming = surgeries.filter((s) => s.status !== 'active' && s.status !== 'completed');

  return (
    <Box>
      <PageHeader title={getGreeting(user?.firstName)} greeting />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{S.activeSurgeries}</Typography>
        <ActiveSurgeriesTable surgeries={active} loading={loading} basePath={basePath} />
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={S.upcoming} value="upcoming" />
          <Tab label={S.past} value="past" />
        </Tabs>
        {tab === 'upcoming' ? (
          <SurgeriesTable
            surgeries={upcoming}
            emptyMessage={S.emptyUpcomingSurgeries}
            showReport={false}
            basePath={basePath}
            onReport={setReportSurgery}
          />
        ) : (
          <SurgeriesTable
            surgeries={past}
            emptyMessage={S.emptyPastSurgeries}
            showReport
            basePath={basePath}
            onReport={setReportSurgery}
          />
        )}
      </Paper>

      {reportSurgery && (
        <TechnicianReportModal
          key={reportSurgery.id || reportSurgery.objectId}
          surgery={reportSurgery}
          open
          onClose={() => setReportSurgery(null)}
        />
      )}
    </Box>
  );
}
