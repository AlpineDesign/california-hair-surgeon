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
 *
 * Bar track and fill use minimum widths so counts never clip in narrow layouts.
 */
/** Enough horizontal room for at least one tabular digit at caption/body2 sizes (avoids clipped counts in tight tables). */
const BAR_TRACK_MIN_PX = 40;
const FILL_MIN_FOR_LABEL_PX = 22;
const LABEL_MIN_CH = 2.75;

export default function GraftProgressBar({ current = 0, goal = 0, min = 0, compact = false }) {
  const range = Math.max(goal - min, 1);
  const filled = Math.min(Math.max(current - min, 0), range);
  const pct = Math.round((filled / range) * 100);
  const showFillLabel = current > min;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: compact ? 140 : 180,
        width: '100%',
      }}
    >
      {!compact && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ minWidth: `${LABEL_MIN_CH}ch`, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {min}
        </Typography>
      )}

      <Box sx={{ flex: 1, minWidth: BAR_TRACK_MIN_PX, position: 'relative' }}>
        <Box
          sx={{
            height: compact ? 18 : 22,
            minWidth: BAR_TRACK_MIN_PX,
            borderRadius: 2,
            bgcolor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${pct}%`,
              minWidth: showFillLabel ? FILL_MIN_FOR_LABEL_PX : 0,
              maxWidth: '100%',
              boxSizing: 'border-box',
              bgcolor: 'primary.main',
              borderRadius: 2,
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pr: 0.75,
            }}
          >
            {showFillLabel && (
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.contrastText',
                  fontSize: 11,
                  lineHeight: 1,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '1ch',
                }}
              >
                {current}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {!compact && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ minWidth: `${LABEL_MIN_CH}ch`, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {goal}
        </Typography>
      )}
    </Box>
  );
}
