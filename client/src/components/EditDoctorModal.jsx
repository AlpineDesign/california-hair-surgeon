import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Autocomplete, TextField, IconButton, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import S from '../strings';

export default function EditDoctorModal({ open, onClose, doctors = [], value = '', onSave }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (open) {
      const doc = doctors.find((d) => (d.id || d.objectId) === value) || null;
      setSelected(doc);
    }
  }, [open, doctors, value]);

  const handleClose = () => onClose();

  const handleSave = () => {
    const d = selected;
    if (!d) {
      onSave?.('', '');
    } else {
      const id = d.id || d.objectId;
      const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || d.username || '';
      onSave?.(id, name);
    }
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {S.editDoctor}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Autocomplete
            options={doctors}
            value={selected}
            onChange={(_, val) => setSelected(val)}
            getOptionLabel={(d) => [d.firstName, d.lastName].filter(Boolean).join(' ') || d.username || ''}
            isOptionEqualToValue={(a, b) => (a?.id || a?.objectId) === (b?.id || b?.objectId)}
            renderInput={(params) => (
              <TextField {...params} label={S.doctor} placeholder={S.select} />
            )}
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
