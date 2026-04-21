import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, Divider,
  Box, TextField, IconButton, List, ListItem, ListItemText, Typography,
  FormControlLabel, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from '../strings';
import S from '../strings';

function SortableGraftItem({ id, idx, button, onDelete, onDefaultChange, allowDefault }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{ px: 0, py: 0.5 }}
      secondaryAction={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {allowDefault && (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={!!button.isDefault}
                  onChange={(e) => onDefaultChange?.(idx, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              label={S.graftButtonDefault}
              labelPlacement="start"
              sx={{ mr: 1 }}
            />
          )}
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            sx={{ color: 'text.secondary' }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      <IconButton
        size="small"
        sx={{ mr: 0.5, cursor: 'grab', touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
      <ListItemText primary={button.label} primaryTypographyProps={{ variant: 'body2' }} />
    </ListItem>
  );
}

/**
 * Modal for editing Graft Buttons (add, delete, reorder).
 * Same format as EditOptionsModal for Application Settings.
 * allowDefault: when true, shows isDefault checkbox per button (global admin + account owner).
 */
export default function EditGraftButtonsModal({ open, onClose, buttons = [], onChange, allowDefault = true }) {
  const [localButtons, setLocalButtons] = useState([]);
  const [newIntact, setNewIntact] = useState('');
  const [newTotal, setNewTotal] = useState('');

  useEffect(() => {
    if (open) {
      const raw = buttons || [];
      const seen = new Set();
      const uniqueByLabel = raw.filter((b) => {
        const lbl = (b?.label || '').trim();
        if (!lbl || seen.has(lbl)) return false;
        seen.add(lbl);
        return true;
      });
      setLocalButtons(uniqueByLabel);
      setNewIntact('');
      setNewTotal('');
    }
  }, [open, buttons]);

  const handleAdd = () => {
    const intact = parseInt(newIntact, 10);
    const total = parseInt(newTotal, 10);
    if (isNaN(intact) || isNaN(total) || total < 1) return;
    const label = `${intact}/${total}`;
    if (localButtons.some((b) => b.label === label)) return;
    const next = [...localButtons, { label, intactHairs: intact, totalHairs: total, isDefault: false }];
    setLocalButtons(next);
    onChange?.(next);
    setNewIntact('');
    setNewTotal('');
  };

  const handleDefaultChange = (idx, checked) => {
    const next = localButtons.map((b, i) =>
      i === idx ? { ...b, isDefault: checked } : b
    );
    setLocalButtons(next);
    onChange?.(next);
  };

  const handleDelete = (idx) => {
    const next = localButtons.filter((_, i) => i !== idx);
    setLocalButtons(next);
    onChange?.(next);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = localButtons.map((_, i) => `graft-${i}`);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(localButtons, oldIndex, newIndex);
    setLocalButtons(reordered);
    onChange?.(reordered);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = localButtons.map((_, i) => `graft-${i}`);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {format(S.editLabelTemplate, { label: S.graftButtons })}
        <IconButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          size="small"
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <List dense sx={{ py: 0 }}>
              {localButtons.map((btn, idx) => (
                <SortableGraftItem
                  key={`${idx}-${btn.label}`}
                  id={itemIds[idx]}
                  idx={idx}
                  button={btn}
                  onDelete={() => handleDelete(idx)}
                  onDefaultChange={handleDefaultChange}
                  allowDefault={allowDefault}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>

        <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={S.intactPlaceholder}
            type="number"
            value={newIntact}
            onChange={(e) => setNewIntact(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            sx={{ width: 80 }}
          />
          <Typography variant="body2" color="text.secondary">/</Typography>
          <TextField
            size="small"
            placeholder={S.totalPlaceholder}
            type="number"
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            sx={{ width: 80 }}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!newIntact.trim() || !newTotal.trim() || parseInt(newTotal, 10) < 1}
            startIcon={<AddIcon />}
          >
            {S.add}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
