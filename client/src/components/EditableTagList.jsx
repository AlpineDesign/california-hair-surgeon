import { useState } from 'react';
import { Box, Chip, TextField, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

/**
 * Inline editable chip list for string arrays in settings.
 * Props:
 *   label    – field label shown above the chips
 *   items    – string[]
 *   onChange – (newItems: string[]) => void
 */
export default function EditableTagList({ label, items = [], onChange }) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const val = input.trim();
    if (!val || items.includes(val)) return;
    onChange([...items, val]);
    setInput('');
  };

  const handleDelete = (item) => onChange(items.filter((i) => i !== item));

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } };

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        {items.map((item) => (
          <Chip
            key={item}
            label={item}
            onDelete={() => handleDelete(item)}
            size="small"
          />
        ))}
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary">None added yet</Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={`Add ${label || 'item'}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ maxWidth: 220 }}
        />
        <IconButton size="small" onClick={handleAdd} color="primary" disabled={!input.trim()}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
