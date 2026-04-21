import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { getSurgeries, deleteSurgery } from '../../api/surgeries';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import RowMenu from '../../components/RowMenu';
import NewSurgeryModal from './NewSurgeryModal';
import EditSurgeryModal from './EditSurgeryModal';
import { getGraftProgressCurrent, getGoalPct, formatDate } from '../../utils/surgery';
import S from '../../strings';
import usePollWhileVisible from '../../hooks/usePollWhileVisible';

const POLL_INTERVAL_MS = 12000;
const COLUMNS = [S.patient, S.date, S.grafts, S.goal, S.actions];

export default function Surgeries() {
  const navigate = useNavigate();
  const [surgeries, setSurgeries] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleDelete = async (id) => {
    try {
      await deleteSurgery(id);
      setSurgeries((prev) => prev.filter((s) => (s.id || s.objectId) !== id));
    } catch (err) {
      console.error('Failed to delete surgery', err);
    }
  };

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

  usePollWhileVisible(fetchSurgeries, POLL_INTERVAL_MS);

  const filtered = surgeries.filter((s) => {
    const name = s.patient?.initials || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Box>
      <PageHeader
        title={S.surgeriesTitle}
        action={S.newSurgery}
        onAction={() => setModalOpen(true)}
        search={search}
        onSearch={setSearch}
      />

      <Paper sx={{ p: 3 }}>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell key={col}>
                    <Typography variant="caption" color="text.secondary">{col}</Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoader colSpan={COLUMNS.length} />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} sx={{ border: 0 }}>
                    <EmptyState
                      icon={<MedicalServicesIcon />}
                      message={S.noSurgeriesFound}
                      action={S.newSurgery}
                      onAction={() => setModalOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const sid = s.id || s.objectId;
                  return (
                  <TableRow
                    key={sid}
                    hover
                    onClick={() => navigate(`/dashboard/surgeries/${sid}`, { state: { surgeryPreview: s } })}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {s.patient?.initials || '—'}
                        </Typography>
                        <StatusBadge status={s.status} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(s.startedAt || s.createdAt)}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 260 }}>
                      <GraftProgressBar current={getGraftProgressCurrent(s)} goal={s.graftGoal ?? 0} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{getGoalPct(s)}</Typography>
                    </TableCell>
                    <TableCell align="right" width={56} onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        onDelete={() => handleDelete(sid)}
                        confirmMessage={S.surgeryDeleteConfirm}
                        extraItems={[
                          {
                            label: S.edit,
                            icon: <EditIcon fontSize="small" />,
                            onClick: () => setEditTarget(s),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <NewSurgeryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(s) => { setSurgeries((prev) => [s, ...prev]); setModalOpen(false); }}
      />

      <EditSurgeryModal
        surgery={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setSurgeries((prev) => prev.map((s) =>
            (s.id || s.objectId) === (updated.id || updated.objectId) ? updated : s
          ));
          setEditTarget(null);
        }}
      />
    </Box>
  );
}
