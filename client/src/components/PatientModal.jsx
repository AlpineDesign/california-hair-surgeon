import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Typography, IconButton, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getOptions } from '../api/settings';
import { createPatient, updatePatient } from '../api/patients';
import PatientFormFields, { PATIENT_EMPTY_FORM } from './PatientForm';
import SurgicalHistory from './SurgicalHistory';
import S from '../strings';

/**
 * Unified create/edit patient modal.
 * mode: 'create' | 'edit'
 * patient: required when mode='edit'
 */
export default function PatientModal({ mode = 'create', patient, open, onClose, onCreated, onSaved }) {
  const [form, setForm] = useState(PATIENT_EMPTY_FORM);
  const [options, setOptions] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getOptions().then(setOptions).catch(() => {});
      if (mode === 'edit' && patient) {
        setForm({
          initials: patient.initials || '',
          dob: patient.dob || '',
          hairType: patient.hairType || '',
          hairColor: patient.hairColor || '',
          hairCaliber: patient.hairCaliber || '',
          skinColor: patient.skinColor || '',
        });
      } else {
        setForm(PATIENT_EMPTY_FORM);
      }
    }
  }, [open, mode, patient]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleClose = () => { setForm(PATIENT_EMPTY_FORM); setError(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.initials) return setError(S.initialsRequired);
    setError('');
    setLoading(true);
    try {
      if (mode === 'create') {
        const created = await createPatient(form);
        onCreated?.(created);
        handleClose();
      } else {
        const updated = await updatePatient(patient.id || patient.objectId, form);
        onSaved?.(updated);
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || (mode === 'create' ? S.createPatientFailed : S.updatePatientFailed));
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = mode === 'create' ? (loading ? 'Creating…' : 'Create Patient') : (loading ? 'Saving…' : 'Save Changes');

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {mode === 'edit' ? (patient?.initials || S.editPatient) : S.newPatientTitle}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box component="form" id="patient-form" onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <PatientFormFields form={form} onChange={handleChange} options={options} />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Box>
        {mode === 'edit' && patient && (
          <SurgicalHistory patientId={patient.id || patient.objectId} />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>{S.cancel}</Button>
        <Button type="submit" form="patient-form" variant="contained" disabled={loading}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
