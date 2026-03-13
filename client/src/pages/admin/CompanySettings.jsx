import { Box, Paper, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import S from '../../strings';

export default function CompanySettings() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>{S.settingsTitle}</Typography>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <SettingsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Settings are managed by the account owner. Use the Clinics list to open their dashboard.
        </Typography>
      </Paper>
    </Box>
  );
}
