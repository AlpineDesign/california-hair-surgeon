import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, MenuItem, Typography, Divider,
  IconButton, Stepper, Step, StepLabel, Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getOptions } from '../../api/settings';
import { getPatients, createPatient } from '../../api/patients';
import { getDoctors } from '../../api/users';
import { createSurgery } from '../../api/surgeries';
import PatientFormFields, { PATIENT_EMPTY_FORM } from '../../components/PatientForm';
import { formatDateMmDdYyyy } from '../../utils/surgery';

const STEPS = ['Patient', 'Surgical Details'];
const emptySurgical = { doctorId: '', doctor: '', graftGoal: '', fueDevice: '', fueTipStyle: '', fueTipSize: '', holdingSolution: '', placingDevice: '' };

function SelectField({ label, name, value, onChange, options = [] }) {
  const labels = (options || []).map((o) => (typeof o === 'object' && o?.label != null ? o.label : String(o)));
  return (
    <TextField select label={label} name={name} value={value} onChange={onChange} fullWidth>
      <MenuItem value=""><em>Select…</em></MenuItem>
      {labels.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
    </TextField>
  );
}

export default function NewSurgeryModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState(PATIENT_EMPTY_FORM);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [surgical, setSurgical] = useState(emptySurgical);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      getOptions().then(setOptions).catch(() => {});
      getPatients().then(setPatients).catch(() => {});
      getDoctors().then(setDoctors).catch(() => {});
    }
  }, [open]);

  const handleClose = () => {
    setStep(0);
    setSelectedPatient(null);
    setNewPatient(PATIENT_EMPTY_FORM);
    setIsNewPatient(false);
    setSurgical(emptySurgical);
    setError('');
    onClose();
  };

  const handleNewPatientChange = (e) => setNewPatient((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleSurgicalChange = (e) => setSurgical((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleNext = () => {
    if (isNewPatient && !newPatient.initials) return setError('Patient initials are required'); // inline validation
    if (!isNewPatient && !selectedPatient) return setError('Please select a patient or create a new one');
    setError('');
    setStep(1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      let patientId = selectedPatient && (selectedPatient.id || selectedPatient.objectId);
      if (isNewPatient) {
        const created = await createPatient(newPatient);
        patientId = created.id || created.objectId;
      }
      if (!patientId) {
        setError('Please select a patient or create a new one');
        setLoading(false);
        return;
      }
      const { graftGoal, doctorId, doctor, ...surgicalRest } = surgical;
      const selectedDoctor = doctorId ? doctors.find((d) => (d.id || d.objectId) === doctorId) : null;
      const doctorName = selectedDoctor ? [selectedDoctor.firstName, selectedDoctor.lastName].filter(Boolean).join(' ') || selectedDoctor.username : (doctor || undefined);
      const surgery = await createSurgery({
        patientId,
        surgical: { ...surgicalRest, doctorId: doctorId || undefined, doctor: doctorName },
        graftGoal: graftGoal ? Number(graftGoal) : undefined,
      });
      onCreated(surgery);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create surgery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {STEPS[step]}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <Box sx={{ px: 3, pt: 1 }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!isNewPatient ? (
              <>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(p) => `${p.initials || ''}${p.dob ? ` · ${formatDateMmDdYyyy(p.dob) || p.dob}` : ''}`}
                  getOptionKey={(p) => p.id || p.objectId}
                  isOptionEqualToValue={(a, b) => (a?.id || a?.objectId) === (b?.id || b?.objectId)}
                  value={selectedPatient}
                  onChange={(_, val) => setSelectedPatient(val)}
                  renderInput={(params) => <TextField {...params} label="Select Patient" fullWidth />}
                />
                <Divider>
                  <Typography variant="caption" color="text.secondary">or</Typography>
                </Divider>
                <Button variant="outlined" onClick={() => { setSelectedPatient(null); setIsNewPatient(true); }}>
                  + New Patient
                </Button>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">New Patient</Typography>
                  <Button size="small" onClick={() => { setIsNewPatient(false); setNewPatient(PATIENT_EMPTY_FORM); }}>
                    Select Existing
                  </Button>
                </Box>
                <PatientFormFields form={newPatient} onChange={handleNewPatientChange} options={options} />
              </>
            )}
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Doctor"
              name="doctorId"
              value={surgical.doctorId}
              onChange={handleSurgicalChange}
              fullWidth
            >
              <MenuItem value=""><em>Select doctor…</em></MenuItem>
              {doctors.map((d) => (
                <MenuItem key={d.id || d.objectId} value={d.id || d.objectId}>
                  {[d.firstName, d.lastName].filter(Boolean).join(' ') || d.username}
                </MenuItem>
              ))}
            </TextField>
            <TextField   label="Surgical Goal"       name="graftGoal"       value={surgical.graftGoal}       onChange={handleSurgicalChange} type="number" fullWidth />
            <SelectField label="FUE Device Used"     name="fueDevice"       value={surgical.fueDevice}       onChange={handleSurgicalChange} options={options.fueDevices ?? []} />
            <SelectField label="FUE Tip Style"       name="fueTipStyle"     value={surgical.fueTipStyle}     onChange={handleSurgicalChange} options={options.fueTipStyles ?? []} />
            <SelectField label="FUE Tip Size"        name="fueTipSize"      value={surgical.fueTipSize}      onChange={handleSurgicalChange} options={options.fueTipSizes ?? []} />
            <SelectField label="Holding Solution"    name="holdingSolution" value={surgical.holdingSolution} onChange={handleSurgicalChange} options={options.holdingSolutions ?? []} />
            <SelectField label="Placing Device Used" name="placingDevice"   value={surgical.placingDevice}   onChange={handleSurgicalChange} options={options.placingDevices ?? []} />
          </Box>
        )}

        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {step === 1 && <Button onClick={() => setStep(0)} disabled={loading}>Back</Button>}
        <Box sx={{ flex: 1 }} />
        {step === 0
          ? <Button variant="contained" onClick={handleNext}>Next</Button>
          : <Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? 'Creating…' : 'Create Surgery'}</Button>
        }
      </DialogActions>
    </Dialog>
  );
}
