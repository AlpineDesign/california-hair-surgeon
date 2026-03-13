import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import { getPatients, deletePatient } from '../../api/patients';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import RowMenu from '../../components/RowMenu';
import PatientModal from '../../components/PatientModal';
import { formatDate, formatDateMmDdYyyy } from '../../utils/surgery';
import S from '../../strings';

const COLUMNS = ['Initials', 'DOB', 'Hair Type', 'Hair Color', 'Skin Color', 'Added', ''];

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleDelete = async (id) => {
    try {
      await deletePatient(id);
      setPatients((prev) => prev.filter((p) => (p.id || p.objectId) !== id));
    } catch (err) {
      console.error('Failed to delete patient', err);
    }
  };

  const filtered = patients.filter((p) =>
    (p.initials || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <PageHeader
        title={S.patientsTitle}
        action="New Patient"
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
                  <TableCell key={col} width={col === '' ? 48 : undefined}>
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
                      icon={<PersonIcon />}
                      message={S.noPatientsFound}
                      action="New Patient"
                      onAction={() => setModalOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow
                    key={p.id || p.objectId}
                    hover
                    onClick={() => setEditTarget(p)}
                    sx={{ cursor: 'pointer' }}
                  >
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
                    <TableCell align="right" width={48} onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        onDelete={() => handleDelete(p.id || p.objectId)}
                        confirmMessage={`Remove patient ${p.initials || ''}? Their surgery history will be preserved.`}
                        extraItems={[
                          { label: 'Edit', icon: <EditIcon fontSize="small" />, onClick: () => setEditTarget(p) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <PatientModal
        mode="create"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(p) => { setPatients((prev) => [p, ...prev]); setModalOpen(false); }}
      />

      <PatientModal
        mode="edit"
        patient={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setPatients((prev) => prev.map((p) =>
            (p.id || p.objectId) === (updated.id || updated.objectId) ? updated : p
          ));
          setEditTarget(null);
        }}
      />
    </Box>
  );
}
