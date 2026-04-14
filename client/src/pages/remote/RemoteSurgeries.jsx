import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Link as MuiLink,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { getSurgeries } from '../../api/surgeries';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PageHeader from '../../components/PageHeader';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import TechnicianReportModal from '../../components/TechnicianReportModal';
import { getTotalGrafts, getGoalPct, formatDate } from '../../utils/surgery';
import S from '../../strings';

const COLUMNS = [S.patient, S.date, S.grafts, S.goal, S.actions];
const BASE_PATH = '/remote/surgeries';

export default function RemoteSurgeries() {
  const [surgeries, setSurgeries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
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
                            component="button"
                            variant="body2"
                            fontWeight={600}
                            onClick={() => setReportSurgery(s)}
                            sx={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                          >
                            {S.report}
                          </MuiLink>
                        ) : (
                          <MuiLink
                            component={Link}
                            to={`${BASE_PATH}/${s.id || s.objectId}`}
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
