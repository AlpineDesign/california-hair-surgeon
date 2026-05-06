import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Tabs, Tab,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getSurgeries } from '../../api/surgeries';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import NewSurgeryModal from './NewSurgeryModal';
import { getGraftProgressCurrent, getGoalPct, formatDateTime } from '../../utils/surgery';
import S from '../../strings';
import usePollWhileVisible from '../../hooks/usePollWhileVisible';
import { STANDARD_POLL_INTERVAL_MS } from '../../constants/polling';

function getGreeting(firstName) {
  const hour = new Date().getHours();
  const time = hour < 12 ? S.goodMorning : hour < 17 ? S.goodAfternoon : S.goodEvening;
  return `${time}${firstName ? ` ${firstName}` : ''}`;
}

const ACTIVE_COLS = [S.patient, S.extractionStarted, S.placingStarted, S.grafts];

function ActiveSurgeriesTable({ surgeries, loading, onNew, onRowClick }) {
  if (loading) {
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
            <TableLoader colSpan={ACTIVE_COLS.length} />
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
  if (!surgeries.length) {
    return <EmptyState icon={<MedicalServicesIcon />} message={S.emptyActiveSurgeries} action={S.newSurgery} onAction={onNew} />;
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
          {surgeries.map((s) => {
            const sid = s.id || s.objectId;
            return (
            <TableRow
              key={sid}
              hover
              onClick={() => onRowClick(s)}
              sx={{ cursor: 'pointer' }}
            >
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
                <GraftProgressBar current={getGraftProgressCurrent(s)} goal={s.graftGoal ?? 0} />
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const UPCOMING_PAST_COLS = [S.patient, S.date, S.grafts, S.goal];

function SurgeriesTable({ surgeries, emptyMessage, onNew, onRowClick }) {
  if (!surgeries.length) {
    return <EmptyState icon={<MedicalServicesIcon />} message={emptyMessage} action={S.newSurgery} onAction={onNew} />;
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
          {surgeries.map((s) => {
            const sid = s.id || s.objectId;
            return (
            <TableRow
              key={sid}
              hover
              onClick={() => onRowClick(s)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Typography variant="body1" fontWeight={600}>{s.patient?.initials || '—'}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatDateTime(s.startedAt || s.createdAt)}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 260 }}>
                <GraftProgressBar current={getGraftProgressCurrent(s)} goal={s.graftGoal ?? 0} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>{getGoalPct(s)}</Typography>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState('upcoming');

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
  }, [fetchSurgeries]);

  usePollWhileVisible(fetchSurgeries, STANDARD_POLL_INTERVAL_MS);

  const active = surgeries.filter((s) => s.status === 'active');
  const past = surgeries.filter((s) => s.status === 'completed');
  const upcoming = surgeries.filter((s) => s.status !== 'active' && s.status !== 'completed');

  const goToSurgery = (s) => {
    const sid = s.id || s.objectId;
    navigate(`/dashboard/surgeries/${sid}`, { state: { surgeryPreview: s } });
  };

  return (
    <Box>
      <PageHeader
        title={getGreeting(user?.firstName)}
        action={S.newSurgery}
        onAction={() => setModalOpen(true)}
        greeting
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{S.activeSurgeries}</Typography>
        <ActiveSurgeriesTable
          surgeries={active}
          loading={loading}
          onNew={() => setModalOpen(true)}
          onRowClick={goToSurgery}
        />
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
            onNew={() => setModalOpen(true)}
            onRowClick={goToSurgery}
          />
        ) : (
          <SurgeriesTable
            surgeries={past}
            emptyMessage={S.emptyPastSurgeries}
            onNew={() => setModalOpen(true)}
            onRowClick={goToSurgery}
          />
        )}
      </Paper>

      <NewSurgeryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(newSurgery) => {
          setSurgeries((prev) => [newSurgery, ...prev]);
          setModalOpen(false);
        }}
      />
    </Box>
  );
}
