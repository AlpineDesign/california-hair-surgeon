import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Autocomplete, TextField, IconButton, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import S from '../strings';

export default function EditTechniciansModal({ open, onClose, technicians = [], value = [], onSave }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) {
      const filtered = technicians.filter((t) =>
        value.includes(t.id || t.objectId)
      );
      setSelected(filtered);
    }
  }, [open, technicians, value]);

  const handleClose = () => onClose();

  const handleSave = () => {
    onSave?.(selected.map((t) => t.id || t.objectId));
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {S.editTechnicians}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Autocomplete
            multiple
            options={technicians}
            value={selected}
            onChange={(_, val) => setSelected(val)}
            getOptionLabel={(t) => [t.firstName, t.lastName].filter(Boolean).join(' ') || t.username || ''}
            isOptionEqualToValue={(a, b) => (a?.id || a?.objectId) === (b?.id || b?.objectId)}
            renderInput={(params) => <TextField {...params} label={S.techniciansCount} placeholder={S.select} />}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>{S.cancel}</Button>
        <Button variant="contained" onClick={handleSave}>{S.save}</Button>
      </DialogActions>
    </Dialog>
  );
}
