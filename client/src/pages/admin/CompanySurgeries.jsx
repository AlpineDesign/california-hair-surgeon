import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Link as MuiLink,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { getSurgeries } from '../../api/surgeries';
import { useAdminCompany } from '../../contexts/AdminCompanyContext';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import { getTotalGrafts, getGoalPct, formatDate } from '../../utils/surgery';
import S from '../../strings';

const POLL_INTERVAL_MS = 5000;
const COLUMNS = [S.patient, S.date, S.grafts, S.goal, S.actions];

export default function CompanySurgeries() {
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
    const interval = setInterval(fetchSurgeries, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSurgeries]);

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
                filtered.map((s) => (
                  <TableRow key={s.id || s.objectId} hover>
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
                      <GraftProgressBar current={getTotalGrafts(s)} goal={s.graftGoal ?? 0} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{getGoalPct(s)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {s.status === 'completed' ? (
                          <MuiLink
                            component={Link}
                            to={`${basePath}/surgeries/${s.id || s.objectId}?report=1`}
                            state={{ backTo: basePath }}
                            variant="body2"
                            fontWeight={600}
                          >
                            {S.report}
                          </MuiLink>
                        ) : (
                          <MuiLink
                            component={Link}
                            to={`${basePath}/surgeries/${s.id || s.objectId}`}
                            state={{ backTo: basePath }}
                            variant="body2"
                            fontWeight={600}
                          >
                            {S.dashboard}
                          </MuiLink>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
