import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, IconButton, Menu, MenuItem, List, ListItem, ListItemText,
  Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  CircularProgress,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getActivities, updateActivity, deleteActivity } from '../api/surgeries';
import { mergeSurgeryPatch, getActivityExtractionBulkCount } from '../utils/surgery';
import S, { format } from '../strings';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

function ActivityItem({ activity, graftButtons, onEdit, onDelete, extractionCompleted }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const labelRaw = activity.payload?.label ?? '—';
  const bulkUnits = getActivityExtractionBulkCount(activity.payload);
  const extractedLabel =
    bulkUnits > 1 ? format(S.activityLogBulkPrimary, { count: bulkUnits, label: labelRaw }) : labelRaw;
  const canEdit = !extractionCompleted && graftButtons?.length > 0;
  const canDelete = !extractionCompleted;

  return (
    <ListItem
      dense
      secondaryAction={
        (canEdit || canDelete) && (
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )
      }
      sx={{ py: 0.5, px: 0 }}
    >
      <ListItemText
        primary={
          <Typography variant="body2">
            {`${S.extraction}: ${extractedLabel}`}
          </Typography>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {activity.user
              ? [activity.user.firstName, activity.user.lastName].filter(Boolean).join(' ') || activity.user.username
              : '—'}
            {' · '}
            {formatTime(activity.createdAt)}
          </Typography>
        }
      />
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {canEdit && (
          <MenuItem onClick={() => { setAnchorEl(null); onEdit(activity); }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => { setAnchorEl(null); onDelete(activity); }} sx={{ color: 'error.main' }}>
            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> {S.remove}
          </MenuItem>
        )}
      </Menu>
    </ListItem>
  );
}

export default function ActivityLogPanel({ surgeryId, onSurgeryUpdate, extractionCompleted, graftButtons, refreshTrigger }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState(null);

  const fetchActivities = useCallback(async () => {
    if (!surgeryId) return;
    setLoading(true);
    try {
      const data = await getActivities(surgeryId);
      const list = Array.isArray(data) ? data : [];
      setActivities(list.filter((a) => a.action === 'extraction'));
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoading(false);
    }
  }, [surgeryId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, refreshTrigger]);

  const handleEdit = (activity) => {
    setEditDialog(activity);
  };

  const handleEditSave = async () => {
    if (!editDialog || !surgeryId) return;
    const newLabel = editDialog.newLabel;
    if (!newLabel) return;
    const btn = graftButtons?.find((b) => b.label === newLabel);
    if (!btn) return;
    try {
      const { surgery } = await updateActivity(surgeryId, editDialog.id, {
        label: btn.label,
        intactHairs: btn.intactHairs,
        totalHairs: btn.totalHairs,
      });
      onSurgeryUpdate?.((prev) => mergeSurgeryPatch(prev, surgery));
      setEditDialog(null);
      fetchActivities();
    } catch (err) {
      console.error('Failed to update activity', err);
    }
  };

  const handleDelete = async (activity) => {
    if (!surgeryId) return;
    try {
      const { surgery } = await deleteActivity(surgeryId, activity.id);
      onSurgeryUpdate?.((prev) => mergeSurgeryPatch(prev, surgery));
      fetchActivities();
    } catch (err) {
      console.error('Failed to delete activity', err);
    }
  };

  return (
    <Paper sx={{ width: 280, flexShrink: 0, maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          {S.activityLog}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {S.activityLogHelper}
        </Typography>
      </Box>
      <List dense sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {loading ? (
          <ListItem sx={{ justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </ListItem>
        ) : activities.length === 0 ? (
          <ListItem>
            <ListItemText primary={S.noActivity} secondary={S.noActivitySecondary} />
          </ListItem>
        ) : (
          activities.map((a) => (
            <ActivityItem
              key={a.id}
              activity={a}
              graftButtons={graftButtons}
              onEdit={handleEdit}
              onDelete={handleDelete}
              extractionCompleted={extractionCompleted}
            />
          ))
        )}
      </List>

      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{S.correctGraftType}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>{S.graftType}</InputLabel>
            <Select
              value={editDialog?.newLabel ?? editDialog?.payload?.label ?? ''}
              label={S.graftType}
              onChange={(e) => setEditDialog((d) => ({ ...d, newLabel: e.target.value }))}
            >
              {(graftButtons || []).map((btn) => (
                <MenuItem key={btn.label} value={btn.label}>
                  {btn.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>{S.cancel}</Button>
          <Button variant="contained" onClick={handleEditSave}>
            {S.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
