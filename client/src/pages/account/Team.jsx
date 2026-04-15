import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, TextField, MenuItem,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Tabs, Tab, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';

import PeopleIcon from '@mui/icons-material/People';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import TableLoader from '../../components/TableLoader';
import RowMenu from '../../components/RowMenu';
import ResetPasswordModal from '../../components/ResetPasswordModal';
import { formatDate } from '../../utils/surgery';
import S, { format } from '../../strings';

const COLUMNS = [S.name, S.username, S.role, S.email, S.lastActive, ''];

const ROLES = [
  { value: 'technician', label: 'Technician' },
  { value: 'doctor',     label: 'Doctor' },
];

function roleLabel(roles = []) {
  if (roles.includes('accountOwner')) return S.roleOwner;
  if (roles.includes('doctor')) return S.doctor;
  if (roles.includes('technician')) return S.technician;
  return S.technician;
}


const emptyAddForm = { firstName: '', lastName: '', username: '', email: '', password: '', role: 'technician' };

function AddUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyAddForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleClose  = () => { setForm(emptyAddForm); setError(''); onClose(); };

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
      setError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Add Team Member
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box component="form" id="add-user-form" onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField select label="Role" name="role" value={form.role} onChange={handleChange} fullWidth>
            {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>
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
        <Button type="submit" form="add-user-form" variant="contained" disabled={loading}>
          {loading ? 'Adding…' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditUserModal({ user, open, onClose, onSaved }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', role: 'technician' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      const roles = user.roles || [];
      setForm({
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        username:  user.username  || '',
        email:     user.email     || '',
        role:      roles.includes('doctor') ? 'doctor' : 'technician',
      });
    }
  }, [open, user]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleClose  = () => { setError(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username) return setError('Username is required');
    setError('');
    setLoading(true);
    try {
      const updated = await updateUser(user.id || user.objectId, form);
      onSaved(updated);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {displayName || 'Edit Member'}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box component="form" id="edit-user-form" onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField select label="Role" name="role" value={form.role} onChange={handleChange} fullWidth>
            {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>
          <TextField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} fullWidth />
          <TextField label="Last Name"  name="lastName"  value={form.lastName}  onChange={handleChange} fullWidth />
          <TextField label="Username"   name="username"  value={form.username}  onChange={handleChange} fullWidth required />
          <TextField label="Email (optional)" name="email" type="email" value={form.email} onChange={handleChange} fullWidth />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="edit-user-form" variant="contained" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Team() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch team members', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => (u.id || u.objectId) !== id));
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const filtered = users.filter((u) => {
    const name  = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    const uname = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const q     = search.toLowerCase();
    const matchesSearch = name.includes(q) || uname.includes(q) || email.includes(q);
    const roles = u.roles || [];
    const isDoctor = roles.includes('doctor');
    const isTechnician = roles.includes('technician') || roles.includes('user');
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'doctor' && isDoctor) ||
      (roleFilter === 'technician' && isTechnician && !isDoctor);
    return matchesSearch && matchesRole;
  });

  const emptyMessage = roleFilter === 'doctor' ? 'No Doctors Found'
    : roleFilter === 'technician' ? 'No Technicians Found'
    : 'No Team Members Found';

  return (
    <Box>
      <PageHeader
        title="Team"
        action="Add Member"
        onAction={() => setModalOpen(true)}
        search={search}
        onSearch={setSearch}
      />

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
                      icon={<PeopleIcon />}
                      message={emptyMessage}
                      action="Add Member"
                      onAction={() => setModalOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const isOwner = (u.roles || []).includes('accountOwner');
                  const openEdit = () => { if (!isOwner) setEditTarget(u); };
                  return (
                  <TableRow
                    key={u.id || u.objectId}
                    hover
                    sx={{ cursor: isOwner ? 'default' : 'pointer' }}
                  >
                    <TableCell onClick={openEdit}>
                      <Typography variant="body1" fontWeight={600}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={openEdit}>
                      <Typography variant="body2" color="text.secondary">{u.username || '—'}</Typography>
                    </TableCell>
                    <TableCell onClick={openEdit}>
                      <Typography variant="body2" color="text.secondary">{roleLabel(u.roles)}</Typography>
                    </TableCell>
                    <TableCell onClick={openEdit}>
                      <Typography variant="body2" color="text.secondary">{u.email || '—'}</Typography>
                    </TableCell>
                    <TableCell onClick={openEdit}>
                      <Typography variant="body2">{formatDate(u.lastActiveAt)}</Typography>
                    </TableCell>
                    <TableCell align="right" width={48} onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        onDelete={isOwner ? undefined : () => handleDelete(u.id || u.objectId)}
                        confirmMessage={format(S.removeFromTeamConfirm, {
                          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
                        })}
                        extraItems={
                          isOwner
                            ? [{ label: S.resetPassword, icon: <LockResetIcon fontSize="small" />, onClick: () => setResetPasswordTarget(u) }]
                            : [
                                { label: S.edit, icon: <EditIcon fontSize="small" />, onClick: () => setEditTarget(u) },
                                { label: S.resetPassword, icon: <LockResetIcon fontSize="small" />, onClick: () => setResetPasswordTarget(u) },
                              ]
                        }
                      />
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(u) => { setUsers((prev) => [...prev, u]); setModalOpen(false); }}
      />

      <EditUserModal
        user={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setUsers((prev) => prev.map((u) =>
            (u.id || u.objectId) === (updated.id || updated.objectId) ? updated : u
          ));
          setEditTarget(null);
        }}
      />

      <ResetPasswordModal
        user={resetPasswordTarget}
        open={Boolean(resetPasswordTarget)}
        onClose={() => setResetPasswordTarget(null)}
      />
    </Box>
  );
}
