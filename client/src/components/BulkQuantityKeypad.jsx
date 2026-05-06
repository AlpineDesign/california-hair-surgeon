import { Box, Button, Typography } from '@mui/material';
import S from '../strings';

/** Matches server EXTRACTION_ACTIVITY_BULK_COUNT_MAX. */
export const BULK_QUANTITY_MAX = 500;
const MAX_DIGITS = String(BULK_QUANTITY_MAX).length;

/**
 * Count entry UI used by bulk add and activity correction (digit pad).
 * Controlled via `countStr` / `onCountChange`.
 */
export default function BulkQuantityKeypad({
  countStr,
  onCountChange,
  disabled = false,
  onInteract,
}) {
  const appendDigit = (digit) => {
    if (disabled) return;
    const next = countStr === '' ? String(digit) : countStr + String(digit);
    if (next.length > MAX_DIGITS) return;
    const n = parseInt(next, 10);
    if (Number.isNaN(n)) return;
    if (n > BULK_QUANTITY_MAX) return;
    onCountChange(String(n));
    onInteract?.();
  };

  const handleClearCount = () => {
    if (disabled) return;
    onCountChange('');
    onInteract?.();
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 360 }}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
        {S.bulkAddCountLabel}
      </Typography>
      <Box
        sx={{
          mt: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          px: 2,
          py: 2,
          bgcolor: 'background.paper',
          textAlign: 'center',
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h3"
          component="div"
          sx={{
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: countStr ? 'text.primary' : 'text.disabled',
          }}
        >
          {countStr || '—'}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.5,
          width: '100%',
          mt: 1.5,
        }}
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Button
            key={d}
            variant="outlined"
            size="large"
            disabled={disabled}
            onClick={() => appendDigit(Number(d))}
            sx={{ minHeight: 56, fontSize: '1.35rem', fontWeight: 600 }}
          >
            {d}
          </Button>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, width: '100%', mt: 1.5 }}>
        <Button
          variant="outlined"
          size="large"
          disabled={disabled}
          onClick={handleClearCount}
          sx={{
            minHeight: 56,
            fontWeight: 600,
            color: 'grey.700',
            borderColor: 'grey.400',
            '&:hover': {
              borderColor: 'grey.500',
              bgcolor: 'grey.50',
            },
          }}
        >
          {S.bulkAddClear}
        </Button>
        <Button
          variant="outlined"
          size="large"
          disabled={disabled}
          onClick={() => appendDigit(0)}
          sx={{ minHeight: 56, fontSize: '1.35rem', fontWeight: 600 }}
        >
          0
        </Button>
      </Box>
    </Box>
  );
}
