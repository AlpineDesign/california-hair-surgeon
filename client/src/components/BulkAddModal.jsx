import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import S, { format } from '../strings';

const BULK_MAX = 500;

export default function BulkAddModal({
  open,
  onClose,
  buttons = [],
  initialLabel = '',
  onSave,
}) {
  const [countStr, setCountStr] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCountStr('');
    setError('');
    const first = buttons[0]?.label ?? '';
    setSelectedLabel(initialLabel && buttons.some((b) => b.label === initialLabel) ? initialLabel : first);
  }, [open, initialLabel, buttons]);

  const handleClose = () => {
    onClose?.();
  };

  const appendDigit = (digit) => {
    const next = countStr === '' ? String(digit) : countStr + String(digit);
    if (next.length > 3) return;
    const n = parseInt(next, 10);
    if (Number.isNaN(n)) return;
    if (n > BULK_MAX) return;
    setCountStr(String(n));
    setError('');
  };

  const handleClearCount = () => {
    setCountStr('');
    setError('');
  };

  const handleSave = () => {
    setError('');
    const n = parseInt(countStr, 10);
    if (Number.isNaN(n) || n < 1) {
      setError(S.bulkAddInvalidCount);
      return;
    }
    if (n > BULK_MAX) {
      setError(format(S.bulkAddMaxCount, { max: BULK_MAX }));
      return;
    }
    const btn = buttons.find((b) => b.label === selectedLabel);
    if (!btn) {
      setError(S.bulkAddSelectType);
      return;
    }
    try {
      onSave?.(n, btn);
      onClose?.();
    } catch (e) {
      if (e?.message === 'skip') return;
      setError(S.bulkAddFailed);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: '90vw',
          height: '90vh',
          maxWidth: 'none',
          maxHeight: 'none',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {S.bulkAddTitle}
        <IconButton onClick={handleClose} size="small" aria-label={S.cancel}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, pt: 2 }}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: '100%', md: '38%' },
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              {S.bulkAddCountLabel}
            </Typography>
            <Box
              sx={{
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
                maxWidth: 360,
                mt: 1,
              }}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <Button
                  key={d}
                  variant="outlined"
                  size="large"
                  onClick={() => appendDigit(Number(d))}
                  sx={{ minHeight: 56, fontSize: '1.35rem', fontWeight: 600 }}
                >
                  {d}
                </Button>
              ))}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
                width: '100%',
                maxWidth: 360,
              }}
            >
              <Button
                variant="outlined"
                size="large"
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
                onClick={() => appendDigit(0)}
                sx={{ minHeight: 56, fontSize: '1.35rem', fontWeight: 600 }}
              >
                0
              </Button>
            </Box>
          </Box>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: { md: 1 },
              borderTop: { xs: 1, md: 0 },
              borderColor: 'divider',
              pl: { md: 3 },
              pt: { xs: 2, md: 0 },
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>
              {S.graftType}
            </Typography>
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                alignContent: 'flex-start',
                gap: 2,
              }}
            >
              {buttons.map((btn) => (
                <Chip
                  key={btn.label}
                  label={btn.label}
                  onClick={() => setSelectedLabel(btn.label)}
                  color={selectedLabel === btn.label ? 'primary' : 'default'}
                  variant={selectedLabel === btn.label ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    minHeight: 48,
                    '& .MuiChip-label': { px: 2 },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <Divider />
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flex: '1 1 auto', textAlign: 'left', minWidth: 0, pr: { sm: 2 } }}
        >
          {S.bulkAddHint}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={handleClose}>
            {S.cancel}
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={buttons.length === 0}>
            {S.save}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
