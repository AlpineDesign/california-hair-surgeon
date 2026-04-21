import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Divider } from '@mui/material';
import { getSurgeriesByPatient } from '../api/surgeries';
import TableLoader from './TableLoader';
import StatusBadge from './StatusBadge';
import { getGraftProgressCurrent, getGoalPct, formatDate } from '../utils/surgery';
import S from '../strings';

export default function SurgicalHistory({ patientId }) {
  const [surgeries, setSurgeries] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    getSurgeriesByPatient(patientId)
      .then(setSurgeries)
      .catch(() => setSurgeries([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>{S.surgeryHistoryLabel}</Typography>

      {loading ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              {[S.date, S.status, S.grafts, S.goal].map((h) => (
                <TableCell key={h}>
                  <Typography variant="caption" color="text.secondary">{h}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableLoader colSpan={4} rows={5} />
          </TableBody>
        </Table>
      ) : !surgeries || surgeries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{S.noSurgeriesOnRecord}</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              {[S.date, S.status, S.grafts, S.goal].map((h) => (
                <TableCell key={h}>
                  <Typography variant="caption" color="text.secondary">{h}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {surgeries.map((s) => {
              const extracted = getGraftProgressCurrent(s);
              const goal = s.graftGoal ?? 0;
              return (
                <TableRow key={s.id || s.objectId}>
                  <TableCell>
                    <Typography variant="body2">{formatDate(s.startedAt || s.createdAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{extracted} / {goal}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{getGoalPct(s)}</Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
