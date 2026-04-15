import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import { getAccounts, deleteAccount } from '../../api/accounts';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import CreateCompanyModal from '../../components/CreateCompanyModal';
import RowMenu from '../../components/RowMenu';
import S from '../../strings';

export default function Accounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <Box>
      <PageHeader
        title={S.companiesTitle}
        action={S.createCompany}
        onAction={() => setCreateOpen(true)}
      />
      <CreateCompanyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchAccounts}
      />

      <Paper sx={{ p: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{S.practiceName}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" color="text.secondary">{S.techniciansCount}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" color="text.secondary">{S.doctorsCount}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{S.lastActivity}</Typography>
                </TableCell>
                <TableCell align="right" width={140} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoader colSpan={5} />
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ border: 0 }}>
                    <EmptyState icon={<BusinessIcon />} message={S.noCompanies} />
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc) => (
                  <TableRow
                    key={acc.id}
                    hover
                    onClick={() => navigate(`/admin/clinics/${acc.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body1" fontWeight={600}>
                        {acc.practiceName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{acc.technicianCount ?? 0}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{acc.doctorCount ?? 0}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {acc.lastActivity
                          ? new Date(acc.lastActivity).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        confirmMessage={S.deleteCompanyConfirm}
                        onDelete={async () => {
                          await deleteAccount(acc.id);
                          fetchAccounts();
                        }}
                      />
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
