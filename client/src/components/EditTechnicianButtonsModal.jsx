import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, Divider, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import S from '../strings';

/** One chip per label — account can have duplicate Option rows with the same label. */
function dedupeGraftButtonsByLabel(buttons) {
  const seen = new Set();
  return (buttons || []).filter((b) => {
    const label = b?.label;
    if (label == null || label === '') return false;
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

/**
 * Modal for technician to add/remove buttons from their view for this surgery.
 * Available = all graft buttons. Selected = currently visible (can add/remove).
 */
export default function EditTechnicianButtonsModal({ open, onClose, graftButtons = [], selectedLabels = [], onSave }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected([...selectedLabels]);
      setSaving(false);
    }
  }, [open, selectedLabels]);

  const toggle = (label) => {
    if (saving) return;
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave?.(selected);
      onClose();
    } catch (err) {
      console.error('Failed to save button config', err);
    } finally {
      setSaving(false);
    }
  };

  const uniqueButtons = dedupeGraftButtonsByLabel(graftButtons);
  const available = uniqueButtons.filter((b) => !selected.includes(b.label));
  const selectedButtons = uniqueButtons.filter((b) => selected.includes(b.label));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={saving}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {S.editButtons}
        <IconButton onClick={handleClose} size="small" aria-label={S.cancel} disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            {S.techEditButtonsSelectedHelp}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start', alignContent: 'flex-start' }}>
            {selectedButtons.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{S.techEditButtonsNoneSelected}</Typography>
            ) : (
              selectedButtons.map((btn) => (
                <Chip
                  key={btn.label}
                  size="large"
                  label={btn.label}
                  onDelete={saving ? undefined : () => toggle(btn.label)}
                  color="primary"
                  disabled={saving}
                />
              ))
            )}
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            {S.techEditButtonsAvailableHelp}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start', alignContent: 'flex-start' }}>
            {available.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{S.techEditButtonsAllSelected}</Typography>
            ) : (
              available.map((btn) => (
                <Chip
                  key={btn.label}
                  size="large"
                  label={btn.label}
                  onClick={saving ? undefined : () => toggle(btn.label)}
                  variant="outlined"
                  sx={{ cursor: saving ? 'default' : 'pointer' }}
                  disabled={saving}
                />
              ))
            )}
          </Box>
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Button onClick={handleClose} disabled={saving}>{S.cancel}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {saving ? S.saving : S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
