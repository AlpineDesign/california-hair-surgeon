import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import S from '../strings';

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

  const handleSave = () => {
    onSave?.(selected);
    onClose();
  };

  const available = graftButtons.filter((b) => !selected.includes(b.label));
  const selectedButtons = graftButtons.filter((b) => selected.includes(b.label));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {S.editButtons}
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            Selected (visible on your buttons)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedButtons.length === 0 ? (
              <Typography variant="body2" color="text.secondary">None selected</Typography>
            ) : (
              selectedButtons.map((btn) => (
                <Chip
                  key={btn.label}
                  label={btn.label}
                  onDelete={() => toggle(btn.label)}
                  color="primary"
                  size="small"
                />
              ))
            )}
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            Available (click to add)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {available.length === 0 ? (
              <Typography variant="body2" color="text.secondary">All buttons selected</Typography>
            ) : (
              available.map((btn) => (
                <Chip
                  key={btn.label}
                  label={btn.label}
                  onClick={() => toggle(btn.label)}
                  variant="outlined"
                  size="small"
                  icon={<AddIcon sx={{ fontSize: 16 }} />}
                  sx={{ cursor: 'pointer' }}
                />
              ))
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{S.cancel}</Button>
        <Button variant="contained" onClick={handleSave}>
          {S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
