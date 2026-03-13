import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, MenuItem, Typography, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getOptions } from '../../api/settings';
import { getDoctors } from '../../api/users';
import { updateSurgery } from '../../api/surgeries';
import { formatDate } from '../../utils/surgery';
import S from '../../strings';

function SelectField({ label, name, value, onChange, options = [] }) {
  const labels = (options || []).map((o) => (typeof o === 'object' && o?.label != null ? o.label : String(o)));
  return (
    <TextField select label={label} name={name} value={value} onChange={onChange} fullWidth>
      <MenuItem value=""><em>{S.select}</em></MenuItem>
      {labels.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
    </TextField>
  );
}

const emptySurgical = { doctorId: '', doctor: '', graftGoal: '', fueDevice: '', fueTipStyle: '', fueTipSize: '', holdingSolution: '', placingDevice: '' };

export default function EditSurgeryModal({ surgery, open, onClose, onSaved }) {
  const [doctors, setDoctors] = useState([]);
  const [surgical, setSurgical] = useState(emptySurgical);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      getOptions().then(setOptions).catch(() => {});
      getDoctors().then(setDoctors).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && surgery) {
      const s = surgery.surgical || {};
      setSurgical({
        doctorId: s.doctorId || s.surgeonId || '',
        doctor: s.doctor ?? s.surgeon ?? '',
        graftGoal: surgery.graftGoal ?? '',
        fueDevice: s.fueDevice ?? '',
        fueTipStyle: s.fueTipStyle ?? '',
        fueTipSize: s.fueTipSize ?? '',
        holdingSolution: s.holdingSolution ?? '',
        placingDevice: s.placingDevice ?? '',
      });
    }
  }, [open, surgery]);

  const handleChange = (e) => setSurgical((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleClose = () => { setError(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { graftGoal, doctorId, doctor, ...rest } = surgical;
      const selectedDoctor = doctorId ? doctors.find((d) => (d.id || d.objectId) === doctorId) : null;
      const doctorName = selectedDoctor ? [selectedDoctor.firstName, selectedDoctor.lastName].filter(Boolean).join(' ') || selectedDoctor.username : (doctor || undefined);
      const updated = await updateSurgery(surgery.id || surgery.objectId, {
        surgical: { ...rest, doctorId: doctorId || undefined, doctor: doctorName },
        graftGoal: graftGoal ? Number(graftGoal) : null,
      });
      onSaved(updated);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update surgery');
    } finally {
      setLoading(false);
    }
  };

  const initials = surgery?.patient?.initials ?? surgery?.patientId?.initials ?? '';
  const date = formatDate(surgery?.startedAt || surgery?.createdAt);
  const patientLabel = initials && date ? `${initials} | ${date}` : date ? date : 'Edit Surgery';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
        {patientLabel}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ paddingTop: '32px !important', pb: 2 }}>
        <Box component="form" id="edit-surgery-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label={S.doctor}
              name="doctorId"
              value={surgical.doctorId}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value=""><em>{S.selectSurgeon}</em></MenuItem>
              {doctors.map((d) => (
                <MenuItem key={d.id || d.objectId} value={d.id || d.objectId}>
                  {[d.firstName, d.lastName].filter(Boolean).join(' ') || d.username}
                </MenuItem>
              ))}
            </TextField>
            <TextField label={S.graftGoal} name="graftGoal" value={surgical.graftGoal} onChange={handleChange} type="number" fullWidth />
            <SelectField label={S.fueDeviceUsed} name="fueDevice" value={surgical.fueDevice} onChange={handleChange} options={options.fueDevices ?? []} />
            <SelectField label={S.fueTipStyle} name="fueTipStyle" value={surgical.fueTipStyle} onChange={handleChange} options={options.fueTipStyles ?? []} />
            <SelectField label={S.fueTipSize} name="fueTipSize" value={surgical.fueTipSize} onChange={handleChange} options={options.fueTipSizes ?? []} />
            <SelectField label={S.holdingSolution} name="holdingSolution" value={surgical.holdingSolution} onChange={handleChange} options={options.holdingSolutions ?? []} />
            <SelectField label={S.placingDeviceUsed} name="placingDevice" value={surgical.placingDevice} onChange={handleChange} options={options.placingDevices ?? []} />
        </Box>
        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>{S.cancel}</Button>
        <Button type="submit" form="edit-surgery-form" variant="contained" disabled={loading}>
          {loading ? 'Saving…' : S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
