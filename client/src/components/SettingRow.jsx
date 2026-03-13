import { useState } from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import EditOptionsModal from './EditOptionsModal';
import S from '../strings';

/**
 * Single application-settings row for Option entities or string arrays.
 * variant 'account': items [{ id, label }], onRefetch
 * variant 'defaults': items string[], onChange(newLabels)
 */
export default function SettingRow({ label, type, items = [], onRefetch, variant = 'account', onChange }) {
  const [modalOpen, setModalOpen] = useState(false);
  const displayItems = Array.isArray(items) ? items : [];
  const getLabel = (item) => (typeof item === 'object' && item?.label != null ? item.label : String(item));
  const isDefaults = variant === 'defaults';

  const handleClose = () => {
    setModalOpen(false);
    if (!isDefaults) onRefetch?.();
  };

  return (
    <Box
      onClick={() => setModalOpen(true)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.75,
        px: 2.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Typography variant="body2" fontWeight={700} sx={{ minWidth: 140, flexShrink: 0 }}>
        {label}
      </Typography>

      <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
        {displayItems.length === 0 && (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
        {displayItems.map((item) => (
          <Chip key={typeof item === 'object' ? item.id : item} label={getLabel(item)} size="small" />
        ))}
      </Box>

      <Button
        variant="contained"
        size="small"
        onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
        sx={{ flexShrink: 0, minWidth: 72 }}
      >
        {S.edit}
      </Button>

      <EditOptionsModal
        open={modalOpen}
        onClose={handleClose}
        label={label}
        type={type}
        items={isDefaults ? displayItems : displayItems.filter((i) => typeof i === 'object' && i?.id)}
        variant={variant}
        onChange={onChange}
      />
    </Box>
  );
}
