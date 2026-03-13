import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { gradients } from '../theme/tokens';

export default function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: gradients.authBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Outlet />
    </Box>
  );
}
