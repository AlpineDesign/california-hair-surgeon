import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

/**
 * Empty-list placeholder.
 *
 * Props:
 *   icon      {ReactElement} — MUI icon element matching the page's nav icon
 *   message   {string}       — e.g. "No Active Surgeries"
 *   action    {string}       — button label (omit to hide button)
 *   onAction  {function}     — button click handler
 */
export default function EmptyState({ icon, message, action, onAction }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 8,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          '& .MuiSvgIcon-root': { fontSize: 32, color: 'text.secondary' },
        }}
      >
        {icon}
      </Box>

      <Typography variant="body1" color="text.secondary" fontWeight={600}>
        {message}
      </Typography>

      {action && onAction && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAction}>
          {action}
        </Button>
      )}
    </Box>
  );
}
