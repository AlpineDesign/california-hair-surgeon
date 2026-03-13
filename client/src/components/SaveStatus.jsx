import { Typography } from '@mui/material';
import S from '../strings';

const LABELS = {
  saving: { text: S.saveStatusSaving,  color: 'text.secondary' },
  saved:  { text: S.saveStatusSaved,    color: 'success.main'   },
  error:  { text: S.saveStatusError, color: 'error.main'  },
};

export default function SaveStatus({ status }) {
  if (!LABELS[status]) return null;
  const { text, color } = LABELS[status];
  return (
    <Typography variant="caption" sx={{ color, transition: 'opacity 0.3s' }}>
      {text}
    </Typography>
  );
}
