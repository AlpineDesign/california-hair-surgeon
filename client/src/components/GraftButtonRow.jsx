import { useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import EditGraftButtonsModal from './EditGraftButtonsModal';
import S from '../strings';

/**
 * Row for editing graft buttons (e.g. 1/1, 2/1).
 * Opens EditGraftButtonsModal on click, same format as other Application Settings rows.
 */
export default function GraftButtonRow({ buttons = [], onChange }) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClose = () => setModalOpen(false);

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
        {S.graftButtons}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
        {buttons.length === 0 && (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
        {buttons.map((btn) => (
          <Chip key={btn.label} label={btn.label} size="small" />
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

      <EditGraftButtonsModal
        open={modalOpen}
        onClose={handleClose}
        buttons={buttons}
        onChange={onChange}
      />
    </Box>
  );
}
