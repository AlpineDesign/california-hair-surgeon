import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, FormControl, InputLabel, Select,
  MenuItem, Button,
} from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { getSurgeries } from '../../api/surgeries';
import { getAccounts } from '../../api/accounts';
import GraftProgressBar from '../../components/GraftProgressBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import { getGraftProgressCurrent, getGoalPct, formatDate } from '../../utils/surgery';
import S from '../../strings';

const COLUMNS = [S.company, S.patient, S.date, S.grafts, S.goal, 'Status'];

function surgeriesToCsv(surgeries) {
  const headers = ['Clinic', 'Patient', 'Date', 'Grafts', 'Goal', 'Status'];
  const rows = surgeries.map((s) => [
    s.account?.practiceName || '',
    s.patient?.initials || '',
    formatDate(s.startedAt || s.createdAt),
    getGraftProgressCurrent(s),
    s.graftGoal ?? '',
    s.status || '',
  ]);
  const escape = (v) => (v != null ? `"${String(v).replace(/"/g, '""')}"` : '');
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ];
  return lines.join('\n');
}

function downloadCsv(surgeries) {
  const csv = surgeriesToCsv(surgeries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `surgeries-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSurgeries() {
  const navigate = useNavigate();
  const [surgeries, setSurgeries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountFilter, setAccountFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  }, []);

  const fetchSurgeries = useCallback(async () => {
    try {
      const params = accountFilter ? { accountId: accountFilter } : { all: '1' };
      const data = await getSurgeries(params);
      setSurgeries(data);
    } catch (err) {
      console.error('Failed to fetch surgeries', err);
    } finally {
      setLoading(false);
    }
  }, [accountFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    setLoading(true);
    fetchSurgeries();
  }, [fetchSurgeries]);

  const handleExportCsv = () => {
    downloadCsv(surgeries);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>
          {S.adminSurgeriesTitle}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>{S.filterByCompany}</InputLabel>
            <Select
              value={accountFilter}
              label={S.filterByCompany}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              <MenuItem value="">{S.allCompanies}</MenuItem>
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.practiceName || '—'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={surgeries.length === 0}
          >
            {S.exportCsv}
          </Button>
        </Box>
      </Box>

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
              ) : surgeries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} sx={{ border: 0 }}>
                    <EmptyState icon={<MedicalServicesIcon />} message={S.noSurgeriesFound} />
                  </TableCell>
                </TableRow>
              ) : (
                surgeries.map((s) => {
                  const aid =
                    s.account?.id
                    ?? (typeof s.accountId === 'string' ? s.accountId : s.accountId?.objectId);
                  const sid = s.id || s.objectId;
                  const canOpen = Boolean(aid && sid);
                  return (
                  <TableRow
                    key={s.id || s.objectId}
                    hover
                    onClick={() => {
                      if (canOpen) navigate(`/admin/clinics/${aid}/surgeries/${sid}`, { state: { surgeryPreview: s } });
                    }}
                    sx={{ cursor: canOpen ? 'pointer' : 'default' }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {s.account?.practiceName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight={600}>
                        {s.patient?.initials || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(s.startedAt || s.createdAt)}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <GraftProgressBar current={getGraftProgressCurrent(s)} goal={s.graftGoal ?? 0} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{getGoalPct(s)}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
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
