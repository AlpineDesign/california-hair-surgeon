import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, Divider,
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

  useEffect(() => {
    if (open) setSelected([...selectedLabels]);
  }, [open, selectedLabels]);

  const toggle = (label) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    try {
      await onSave?.(selected);
      onClose();
    } catch (err) {
      console.error('Failed to save button config', err);
    }
  };

  const uniqueButtons = dedupeGraftButtonsByLabel(graftButtons);
  const available = uniqueButtons.filter((b) => !selected.includes(b.label));
  const selectedButtons = uniqueButtons.filter((b) => selected.includes(b.label));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {S.editButtons}
        <IconButton onClick={onClose} size="small" aria-label={S.cancel}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            Selected (visible on your buttons)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start', alignContent: 'flex-start' }}>
            {selectedButtons.length === 0 ? (
              <Typography variant="body2" color="text.secondary">None selected</Typography>
            ) : (
              selectedButtons.map((btn) => (
                <Chip
                  key={btn.label}
                  size="large"
                  label={btn.label}
                  onDelete={() => toggle(btn.label)}
                  color="primary"
                />
              ))
            )}
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            Available (click to add)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start', alignContent: 'flex-start' }}>
            {available.length === 0 ? (
              <Typography variant="body2" color="text.secondary">All buttons selected</Typography>
            ) : (
              available.map((btn) => (
                <Chip
                  key={btn.label}
                  size="large"
                  label={btn.label}
                  onClick={() => toggle(btn.label)}
                  variant="outlined"
                  sx={{ cursor: 'pointer' }}
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
        <Button onClick={onClose}>{S.cancel}</Button>
        <Button variant="contained" onClick={handleSave}>
          {S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
