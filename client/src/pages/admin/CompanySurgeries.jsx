import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { getSurgeries } from '../../api/surgeries';
import { useAdminCompany } from '../../contexts/AdminCompanyContext';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import { getGraftProgressCurrent, getGoalPct, formatDate } from '../../utils/surgery';
import S from '../../strings';
import usePollWhileVisible from '../../hooks/usePollWhileVisible';
import { STANDARD_POLL_INTERVAL_MS } from '../../constants/polling';
const COLUMNS = [S.patient, S.date, S.grafts, S.goal];

export default function CompanySurgeries() {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const adminCompany = useAdminCompany();
  const [surgeries, setSurgeries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const effectiveAccountId = adminCompany?.accountId || accountId;

  const fetchSurgeries = useCallback(async () => {
    if (!effectiveAccountId) return;
    try {
      const data = await getSurgeries({ accountId: effectiveAccountId });
      setSurgeries(data);
    } catch (err) {
      console.error('Failed to fetch surgeries', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveAccountId]);

  useEffect(() => {
    setLoading(true);
    fetchSurgeries();
  }, [fetchSurgeries]);

  usePollWhileVisible(fetchSurgeries, STANDARD_POLL_INTERVAL_MS);

  const filtered = surgeries.filter((s) => {
    const name = s.patient?.initials || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const basePath = `/admin/clinics/${effectiveAccountId}`;

  return (
    <Box>
      <PageHeader
        title={S.surgeriesTitle}
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
                    <EmptyState icon={<MedicalServicesIcon />} message={S.noSurgeriesFound} />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const sid = s.id || s.objectId;
                  return (
                  <TableRow
                    key={sid}
                    hover
                    onClick={() => navigate(`${basePath}/surgeries/${sid}`, { state: { backTo: basePath, surgeryPreview: s } })}
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
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
