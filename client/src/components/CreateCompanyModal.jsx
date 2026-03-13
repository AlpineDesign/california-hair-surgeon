import { useState } from 'react';
import {
  Box, Typography, TextField, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Divider, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { createAccountWithOwner } from '../api/accounts';
import S from '../strings';

const emptyForm = {
  practiceName: '',
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
};

export default function CreateCompanyModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleClose = () => {
    setForm(emptyForm);
    setError('');
    setCredentials(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return setError(S.usernamePasswordRequired);
    setError('');
    setLoading(true);
    try {
      await createAccountWithOwner({
        practiceName: form.practiceName.trim() || undefined,
        username: form.username.trim(),
        password: form.password,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      setCredentials({ username: form.username.trim(), password: form.password });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.error || S.createCompanyFailed);
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `${S.username}: ${credentials.username}\n${S.password}: ${credentials.password}`;
    navigator.clipboard?.writeText(text);
  };

  const copyPassword = () => {
    if (credentials?.password) navigator.clipboard?.writeText(credentials.password);
  };

  if (credentials) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {S.createCompanyCredentialsTitle}
          <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            {S.createCompanySuccess}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {S.createCompanyCredentialsHelp}
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: 'body2.fontSize' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>{S.username}:</Typography>
              <Typography variant="body2" component="span">{credentials.username}</Typography>
              <IconButton size="small" onClick={copyCredentials} title={S.copy} aria-label={S.copy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>{S.password}:</Typography>
              <Typography variant="body2" component="span">{credentials.password}</Typography>
              <IconButton size="small" onClick={copyPassword} title={S.copy} aria-label={S.copy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={handleClose}>{S.done}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {S.createCompany}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box component="form" id="create-company-form" onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label={S.practiceName}
            name="practiceName"
            value={form.practiceName}
            onChange={handleChange}
            fullWidth
            placeholder={S.createCompanyPracticePlaceholder}
          />
          <Typography variant="subtitle2" color="text.secondary">{S.createCompanyOwnerSection}</Typography>
          <TextField label={S.firstName} name="firstName" value={form.firstName} onChange={handleChange} fullWidth />
          <TextField label={S.lastName} name="lastName" value={form.lastName} onChange={handleChange} fullWidth />
          <TextField label={S.username} name="username" value={form.username} onChange={handleChange} fullWidth required />
          <TextField label={S.email} name="email" type="email" value={form.email} onChange={handleChange} fullWidth helperText={S.emailHelper} />
          <TextField label={S.password} name="password" type="password" value={form.password} onChange={handleChange} fullWidth required />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>{S.cancel}</Button>
        <Button type="submit" form="create-company-form" variant="contained" disabled={loading}>
          {loading ? S.createCompanyCreating : S.createCompany}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
