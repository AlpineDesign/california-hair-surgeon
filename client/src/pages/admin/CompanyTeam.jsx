import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Tabs, Tab,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import { getUsers } from '../../api/users';
import { useAdminCompany } from '../../contexts/AdminCompanyContext';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import { formatDate } from '../../utils/surgery';
import S from '../../strings';

const COLUMNS = [S.name, S.username, S.role, S.email, S.lastActive];

function roleLabel(roles = []) {
  if (roles.includes('doctor')) return 'Doctor';
  if (roles.includes('technician')) return 'Technician';
  return 'Technician';
}

export default function CompanyTeam() {
  const adminCompany = useAdminCompany();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    if (!adminCompany?.accountId) return;
    try {
      const data = await getUsers({ accountId: adminCompany.accountId });
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch team', err);
    } finally {
      setLoading(false);
    }
  }, [adminCompany?.accountId]);

  useEffect(() => {
    setLoading(true);
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    const uname = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = name.includes(q) || uname.includes(q) || email.includes(q);
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'doctor' && (u.roles || []).includes('doctor')) ||
      (roleFilter === 'technician' && !(u.roles || []).includes('doctor'));
    return matchesSearch && matchesRole;
  });

  const emptyMessage = roleFilter === 'doctor' ? 'No Doctors Found'
    : roleFilter === 'technician' ? 'No Technicians Found'
    : 'No Team Members Found';

  return (
    <Box>
      <PageHeader title={S.team} search={search} onSearch={setSearch} />

      <Paper sx={{ p: 3 }}>
        <Tabs
          value={roleFilter}
          onChange={(_, v) => setRoleFilter(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" value="all" />
          <Tab label="Doctors" value="doctor" />
          <Tab label="Technicians" value="technician" />
        </Tabs>

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
                    <EmptyState icon={<PeopleIcon />} message={emptyMessage} />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id || u.objectId} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight={600}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{u.username || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{roleLabel(u.roles)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{u.email || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(u.lastActiveAt)}</Typography>
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
