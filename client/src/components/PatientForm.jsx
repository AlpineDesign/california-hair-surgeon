import { TextField, MenuItem } from '@mui/material';
import S from '../strings';

export const PATIENT_EMPTY_FORM = {
  initials: '',
  dob: '',
  hairType: '',
  hairColor: '',
  hairCaliber: '',
  skinColor: '',
};

function SelectField({ label, name, value, onChange, options = [] }) {
  const labels = (options || []).map((o) => (typeof o === 'object' && o?.label != null ? o.label : String(o)));
  return (
    <TextField select label={label} name={name} value={value} onChange={onChange} fullWidth>
      <MenuItem value=""><em>{S.select}</em></MenuItem>
      {labels.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
    </TextField>
  );
}

/**
 * Shared patient form fields. DOB is free text (e.g. MM/DD/YYYY) — matches list/detail formatting.
 * Used in: PatientModal, NewSurgeryModal inline new patient.
 */
export default function PatientFormFields({ form, onChange, options = {} }) {
  return (
    <>
      <TextField
        label={S.initials}
        name="initials"
        value={form.initials}
        onChange={onChange}
        fullWidth
        required
        helperText={S.initialsHelper}
      />
      <TextField
        label={S.dateOfBirth}
        name="dob"
        value={form.dob ?? ''}
        onChange={onChange}
        fullWidth
        placeholder={S.dobPlaceholder}
      />
      <SelectField label={S.hairType} name="hairType" value={form.hairType} onChange={onChange} options={options.hairTypes ?? []} />
      <SelectField label={S.hairColor} name="hairColor" value={form.hairColor} onChange={onChange} options={options.hairColors ?? []} />
      <SelectField label={S.hairCaliber} name="hairCaliber" value={form.hairCaliber} onChange={onChange} options={options.hairCalibers ?? []} />
      <SelectField label={S.skinColor} name="skinColor" value={form.skinColor} onChange={onChange} options={options.skinColors ?? []} />
    </>
  );
}
