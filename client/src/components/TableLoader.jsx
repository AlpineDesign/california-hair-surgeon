import { TableRow, TableCell, Skeleton } from '@mui/material';

/**
 * Renders skeleton placeholder rows inside a TableBody while data is loading.
 *
 * Props:
 *   colSpan {number} — number of columns (one TableCell + Skeleton per column per row)
 *   rows  {number} — how many skeleton rows (default 6)
 */
export default function TableLoader({ colSpan, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIdx) => (
        <TableRow key={rowIdx}>
          {Array.from({ length: colSpan }, (_, colIdx) => (
            <TableCell key={colIdx} sx={{ border: 0 }}>
              <Skeleton
                variant="rounded"
                height={20}
                sx={{
                  maxWidth: colIdx === 0 ? 200 : colIdx === colSpan - 1 ? 140 : 96,
                  width: '100%',
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
