import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, TextField,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import { formatDate } from '../../utils/surgery';

const COLUMNS = ['#', 'Name', 'Email', 'Last Active', ''];

const emptyForm = { firstName: '', lastName: '', username: '', email: '', password: '' };

function AddTechnicianModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleClose = () => { setForm(emptyForm); setError(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return setError('Username and password are required');
    setError('');
    setLoading(true);
    try {
      const user = await createUser(form);
      onCreated(user);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add technician');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Add Technician
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box component="form" id="add-tech-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} fullWidth />
          <TextField label="Last Name"  name="lastName"  value={form.lastName}  onChange={handleChange} fullWidth />
          <TextField label="Username"   name="username"  value={form.username}  onChange={handleChange} fullWidth required />
          <TextField label="Email (optional)" name="email" type="email" value={form.email} onChange={handleChange} fullWidth />
          <TextField label="Password"   name="password"  type="password" value={form.password} onChange={handleChange} fullWidth required />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="add-tech-form" variant="contained" disabled={loading}>
          {loading ? 'Adding…' : 'Add Technician'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditTechnicianModal({ technician, open, onClose, onSaved }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && technician) {
      setForm({
        firstName: technician.firstName || '',
        lastName:  technician.lastName  || '',
        username:  technician.username  || '',
        email:     technician.email     || '',
      });
    }
  }, [open, technician]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleClose  = () => { setError(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username) return setError('Username is required');
    setError('');
    setLoading(true);
    try {
      const updated = await updateUser(technician.id || technician.objectId, form);
      onSaved(updated);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update technician');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit Technician
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box component="form" id="edit-tech-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} fullWidth />
          <TextField label="Last Name"  name="lastName"  value={form.lastName}  onChange={handleChange} fullWidth />
          <TextField label="Username"   name="username"  value={form.username}  onChange={handleChange} fullWidth required />
          <TextField label="Email (optional)" name="email" type="email" value={form.email} onChange={handleChange} fullWidth />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="edit-tech-form" variant="contained" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Technicians() {
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchTechnicians = useCallback(async () => {
    try {
      const data = await getUsers();
      setTechnicians(data);
    } catch (err) {
      console.error('Failed to fetch technicians', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTechnicians(); }, [fetchTechnicians]);

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      setTechnicians((prev) => prev.filter((t) => (t.id || t.objectId) !== id));
    } catch (err) {
      console.error('Failed to delete technician', err);
    }
  };

  const filtered = technicians.filter((t) => {
    const name = `${t.firstName || ''} ${t.lastName || ''}`.trim().toLowerCase();
    const email = (t.email || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <Box>
      <PageHeader
        title="Technicians"
        action="Add Technician"
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
                  <TableCell key={col} width={col === '#' ? 48 : col === '' ? 48 : undefined}>
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
                      icon={<PeopleIcon />}
                      message="No Technicians Found"
                      action="Add Technician"
                      onAction={() => setModalOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t, i) => (
                  <TableRow key={t.id || t.objectId} hover>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{i + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        onClick={() => setEditTarget(t)}
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {[t.firstName, t.lastName].filter(Boolean).join(' ') || t.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{t.email || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(t.lastActiveAt)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleDelete(t.id || t.objectId)} sx={{ color: 'text.secondary' }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <AddTechnicianModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(user) => setTechnicians((prev) => [...prev, user])}
      />

      <EditTechnicianModal
        technician={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setTechnicians((prev) => prev.map((t) => (t.id || t.objectId) === (updated.id || updated.objectId) ? updated : t));
          setEditTarget(null);
        }}
      />
    </Box>
  );
}
