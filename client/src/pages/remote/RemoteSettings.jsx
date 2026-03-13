import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Divider, InputAdornment,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import useAutoSave from '../../hooks/useAutoSave';
import { updateMe } from '../../api/users';
import ResetOwnPasswordModal from '../../components/ResetOwnPasswordModal';
import PageHeader from '../../components/PageHeader';
import SaveStatus from '../../components/SaveStatus';
import S from '../../strings';

function Section({ title, description, saveStatus, children }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        <SaveStatus status={saveStatus} />
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Paper>
  );
}

/**
 * Technician settings — personal account only (no clinic/application settings).
 */
export default function RemoteSettings() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [personal, setPersonal] = useState({
    username: '', firstName: '', lastName: '', email: '', phone: '',
  });
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const { status: personalStatus } = useAutoSave(
    personal,
    (data) => updateMe(data),
    { enabled: ready },
  );

  useEffect(() => {
    if (user) {
      setPersonal({
        username:  user.username  || '',
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        email:     user.email     || '',
        phone:     user.phone     || '',
      });
    }
    setReady(true);
  }, [user]);

  const handlePersonalChange = (e) => setPersonal((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleOpenResetPassword = () => setResetPasswordOpen(true);

  return (
    <Box>
      <PageHeader title={S.settingsTitle} />

      <Section title={S.personalTitle} description={S.personalDescription} saveStatus={personalStatus}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField label={S.username} name="username" fullWidth value={personal.username} onChange={handlePersonalChange} />
          </Grid>
          <Grid item xs={12} sm={6} />
          <Grid item xs={12} sm={6}>
            <TextField label={S.firstName} name="firstName" fullWidth value={personal.firstName} onChange={handlePersonalChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label={S.lastName} name="lastName" fullWidth value={personal.lastName} onChange={handlePersonalChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={S.email} name="email" type="email" fullWidth
              value={personal.email} onChange={handlePersonalChange}
              helperText={S.emailHelper}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label={S.phone} name="phone" fullWidth value={personal.phone} onChange={handlePersonalChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={S.password}
              type="password"
              fullWidth
              value="••••••••••••"
              disabled
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleOpenResetPassword}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {S.resetButton}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Section>

      <ResetOwnPasswordModal
        open={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
      />
    </Box>
  );
}
