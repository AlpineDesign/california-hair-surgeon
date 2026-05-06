import { useState, useEffect, useRef } from 'react';
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
import BulkQuantityKeypad, { BULK_QUANTITY_MAX as BULK_MAX } from './BulkQuantityKeypad';

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
  const [saving, setSaving] = useState(false);
  /** Only reset graft selection / keypad when dialog opens — not when parent re-renders during save (new buttons[] refs). */
  const hasInitializedForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasInitializedForOpenRef.current = false;
      return;
    }
    if (hasInitializedForOpenRef.current) return;
    if (buttons.length === 0) return;
    hasInitializedForOpenRef.current = true;
    setCountStr('');
    setError('');
    setSaving(false);
    const first = buttons[0]?.label ?? '';
    setSelectedLabel(
      initialLabel && buttons.some((b) => b.label === initialLabel) ? initialLabel : first
    );
  }, [open, initialLabel, buttons]);

  const handleClose = () => {
    onClose?.();
  };

  const handleSave = async () => {
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
      setSaving(true);
      await Promise.resolve(onSave?.(n, btn));
      onClose?.();
    } catch (e) {
      if (e?.message === 'skip') return;
      setError(S.bulkAddFailed);
    } finally {
      setSaving(false);
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
            }}
          >
            <BulkQuantityKeypad
              countStr={countStr}
              onCountChange={(s) => {
                setCountStr(s);
                setError('');
              }}
              disabled={saving}
            />
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
          <Button variant="contained" onClick={handleSave} disabled={buttons.length === 0 || saving}>
            {S.save}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
