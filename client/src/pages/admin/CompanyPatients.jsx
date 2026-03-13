import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { getPatients } from '../../api/patients';
import { useAdminCompany } from '../../contexts/AdminCompanyContext';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import { formatDate, formatDateMmDdYyyy } from '../../utils/surgery';
import S from '../../strings';

const COLUMNS = ['#', 'Initials', 'DOB', 'Hair Type', 'Hair Color', 'Skin Color', 'Added'];

export default function CompanyPatients() {
  const adminCompany = useAdminCompany();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!adminCompany?.accountId) return;
    try {
      const data = await getPatients({ accountId: adminCompany.accountId });
      setPatients(data);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoading(false);
    }
  }, [adminCompany?.accountId]);

  useEffect(() => {
    setLoading(true);
    fetchPatients();
  }, [fetchPatients]);

  const filtered = patients.filter((p) =>
    (p.initials || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <PageHeader
        title={S.patients}
        search={search}
        onSearch={setSearch}
      />

      <Paper sx={{ p: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell key={col} width={col === '#' ? 48 : undefined}>
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
                    <EmptyState icon={<PersonIcon />} message="No Patients Found" />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p, i) => (
                  <TableRow key={p.id || p.objectId} hover>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{i + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight={700}>
                        {p.initials || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDateMmDdYyyy(p.dob) || p.dob || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.hairType || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.hairColor || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.skinColor || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(p.createdAt)}</Typography>
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
