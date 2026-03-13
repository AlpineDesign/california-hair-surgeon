import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, Divider,
  Box, TextField, IconButton, List, ListItem, ListItemText,
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
import { createOption, deleteOption, reorderOptions } from '../api/options';
import { format } from '../strings';
import S from '../strings';

/**
 * Props:
 *   variant   'account' | 'defaults'
 *   - account: items [{ id, label }], uses options API
 *   - defaults: items string[], onChange(newLabels) callback
 */
function SortableListItem({ id, item, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{ px: 0, py: 0.5 }}
      secondaryAction={
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          sx={{ color: 'text.secondary' }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
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
      <ListItemText primary={item?.label ?? item} primaryTypographyProps={{ variant: 'body2' }} />
    </ListItem>
  );
}

/**
 * Modal for editing Options (create, delete, reorder).
 * Props: open, onClose, label, type, items
 *   variant 'account' (default): items [{ id, label }], uses options API
 *   variant 'defaults': items string[], onChange(newLabels) callback
 */
export default function EditOptionsModal({
  open, onClose, label, type, items = [], variant = 'account', onChange,
}) {
  const [localItems, setLocalItems] = useState([]);
  const [newInput, setNewInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isDefaults = variant === 'defaults';

  useEffect(() => {
    if (open) {
      const arr = Array.isArray(items) ? items : [];
      setLocalItems(isDefaults ? arr.map((s) => (typeof s === 'string' ? s : String(s))) : [...arr]);
      setNewInput('');
      setError(null);
    }
  }, [open, items, isDefaults]);

  const handleAdd = async () => {
    const val = newInput.trim();
    if (!val) return;
    if (isDefaults) {
      if (localItems.includes(val)) return;
      const next = [...localItems, val];
      setLocalItems(next);
      setNewInput('');
      onChange?.(next);
      return;
    }
    if (localItems.some((i) => (i?.label ?? i) === val)) return;
    setLoading(true);
    setError(null);
    try {
      const created = await createOption({ type, label: val });
      if (created?.id) setLocalItems((prev) => [...prev, { id: created.id, label: created.label }]);
      setNewInput('');
    } catch (err) {
      setError(err?.response?.data?.error ?? err.message ?? S.addFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (optionIdOrIndex) => {
    if (isDefaults) {
      const idx = typeof optionIdOrIndex === 'number' ? optionIdOrIndex : localItems.indexOf(optionIdOrIndex);
      if (idx < 0) return;
      const next = localItems.filter((_, i) => i !== idx);
      setLocalItems(next);
      onChange?.(next);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await deleteOption(optionIdOrIndex);
      setLocalItems((prev) => prev.filter((i) => i?.id !== optionIdOrIndex));
    } catch (err) {
      setError(err?.response?.data?.error ?? err.message ?? S.deleteFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = isDefaults
      ? localItems.map((_, i) => `defaults-${i}`)
      : localItems.map((i) => i?.id).filter(Boolean);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(localItems, oldIndex, newIndex);
    if (isDefaults) {
      setLocalItems(reordered);
      onChange?.(reordered);
      return;
    }
    const newIds = reordered.map((i) => i?.id).filter(Boolean);
    setLoading(true);
    setError(null);
    try {
      await reorderOptions(type, newIds);
      setLocalItems(reordered);
    } catch (err) {
      setError(err?.response?.data?.error ?? err.message ?? S.reorderFailed);
    } finally {
      setLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = isDefaults
    ? localItems.map((_, i) => `defaults-${i}`)
    : localItems.map((i) => i?.id).filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {format(S.editLabelTemplate, { label })}
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
        {error && (
          <Box sx={{ color: 'error.main', fontSize: 'body2.fontSize', mb: 2 }}>
            {error}
          </Box>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <List dense sx={{ py: 0 }}>
              {localItems.map((item, idx) => (
                <SortableListItem
                  key={isDefaults ? `defaults-${idx}` : (item?.id ?? item)}
                  id={itemIds[idx]}
                  item={typeof item === 'string' ? { label: item } : item}
                  onDelete={() => handleDelete(isDefaults ? idx : item?.id)}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField
            size="small"
            placeholder={format(S.addLabelTemplate, { label })}
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            fullWidth
            disabled={loading}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!newInput.trim() || loading}
            startIcon={<AddIcon />}
          >
            {S.add}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
