import { Chip } from '@mui/material';
import S from '../strings';

const config = {
  active:    { label: S.statusActive, color: 'success' },
  completed: { label: S.statusCompleted, color: 'default' },
};

/** Shared Chip styles so uppercase labels sit vertically centered (MUI label line-height defaults sit low). */
export const STATUS_CHIP_SX = {
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: '0.05em',
  height: 22,
  '& .MuiChip-label': {
    lineHeight: '22px',
    px: 1,
    py: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

/**
 * Compact status badge. Used on surgery rows and surgery detail header.
 * Only renders when status is active or completed.
 * Props:
 *   status {string} — 'active' | 'completed' | 'pending' | undefined
 */
export default function StatusBadge({ status }) {
  const cfg = config[status];
  if (!cfg) return null;
  return <Chip label={cfg.label} color={cfg.color} size="small" sx={STATUS_CHIP_SX} />;
}
