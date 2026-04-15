import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getSurgeries } from '../../api/surgeries';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import { getTotalGrafts, getGoalPct, formatDate } from '../../utils/surgery';
import S from '../../strings';

const COLUMNS = [S.patient, S.date, S.grafts, S.goal];
const BASE_PATH = '/remote/surgeries';

export default function RemoteSurgeries() {
  const navigate = useNavigate();
  const [surgeries, setSurgeries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchSurgeries(); }, [fetchSurgeries]);

  const filtered = surgeries.filter((s) => {
    const name = s.patient?.initials || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

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
                    onClick={() => navigate(`${BASE_PATH}/${sid}`)}
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
                      <GraftProgressBar current={getTotalGrafts(s)} goal={s.graftGoal ?? 0} />
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
