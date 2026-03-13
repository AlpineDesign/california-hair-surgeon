import { TableRow, TableCell, Box, CircularProgress } from '@mui/material';

/**
 * Renders a full-width spinner row inside a TableBody while data is loading.
 * Drop-in replacement for the empty-state row.
 *
 * Props:
 *   colSpan  {number} — must match the number of columns in the table
 */
export default function TableLoader({ colSpan }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ border: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      </TableCell>
    </TableRow>
  );
}
