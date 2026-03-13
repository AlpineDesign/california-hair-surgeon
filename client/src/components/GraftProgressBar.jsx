import { Box, Typography } from '@mui/material';

/**
 * Displays graft extraction progress as a filled bar between a min and goal value.
 * Used on: Home (active + completed lists), Surgeries list, Surgery Detail.
 *
 * Props:
 *   current  {number} — current graft count
 *   goal     {number} — target graft count
 *   min      {number} — starting offset (default 0)
 *   compact  {bool}   — smaller height, no labels (for table rows)
 */
export default function GraftProgressBar({ current = 0, goal = 0, min = 0, compact = false }) {
  const range = Math.max(goal - min, 1);
  const filled = Math.min(Math.max(current - min, 0), range);
  const pct = Math.round((filled / range) * 100);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: compact ? 120 : 160 }}>
      {!compact && (
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 28 }}>
          {min}
        </Typography>
      )}

      <Box sx={{ flex: 1, position: 'relative' }}>
        <Box
          sx={{
            height: compact ? 18 : 22,
            borderRadius: 2,
            bgcolor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${pct}%`,
              bgcolor: 'primary.main',
              borderRadius: 2,
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pr: 0.75,
            }}
          >
            {current > min && (
              <Typography variant="caption" sx={{ color: 'primary.contrastText', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>
                {current}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {!compact && (
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 36 }}>
          {goal}
        </Typography>
      )}
    </Box>
  );
}
