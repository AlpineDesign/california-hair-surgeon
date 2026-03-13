import { Box, Typography, Button, TextField, InputAdornment } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import S from '../strings';

/**
 * Consistent page title row with optional search input and primary action button.
 *
 * Props:
 *   title        {string}
 *   action       {string}   — button label (omit to hide button)
 *   onAction     {function} — button click handler
 *   search       {string}   — controlled search value (omit to hide search)
 *   onSearch     {function} — (value: string) => void
 *   greeting     {bool}     — renders title larger (for Home page greeting)
 */
export default function PageHeader({ title, action, onAction, search, onSearch, greeting = false }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2 }}>
      <Typography variant={greeting ? 'h4' : 'h5'} fontWeight={700} sx={{ flexShrink: 0 }}>
        {title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
        {onSearch !== undefined && (
          <TextField
            placeholder={S.search}
            size="small"
            value={search ?? ''}
            onChange={(e) => onSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220 }}
          />
        )}
        {action && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAction} sx={{ flexShrink: 0 }}>
            {action}
          </Button>
        )}
      </Box>
    </Box>
  );
}
