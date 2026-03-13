import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, Typography, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { updateUser } from '../api/users';
import S from '../strings';

/**
 * Modal for account admin to reset a team member's password.
 * Props: user { id, firstName, lastName, username }, open, onClose, onSuccess
 */
export default function ResetPasswordModal({ user, open, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [open]);

  const displayName = user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.username) : '';
  const handleClose = () => { setError(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) return setError('Password is required');
    if (password !== confirmPassword) return setError(S.passwordsMismatch);
    setLoading(true);
    try {
      await updateUser(user.id || user.objectId, { password: password.trim() });
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {S.resetPassword}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {S.resetPasswordFor}: <Box component="span" fontWeight={600} color="text.primary">{displayName}</Box>
        </Typography>
        <Box component="form" id="reset-password-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={`${S.newPassword} *`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />
          <TextField
            label={`${S.confirmPassword} *`}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>{S.cancel}</Button>
        <Button
          type="submit"
          form="reset-password-form"
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Resetting…' : S.resetPassword}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
