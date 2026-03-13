import { useState } from 'react';
import {
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import S from '../strings';

/**
 * Reusable 3-dot row action menu.
 *
 * Props:
 *   onDelete        {function}  Called after the user confirms deletion.
 *   confirmMessage  {string}    Optional custom confirmation message.
 *   extraItems      {Array}     Optional additional MenuItems before Delete.
 *                               Each: { label, icon, onClick }
 */
export default function RowMenu({ onDelete, confirmMessage, extraItems = [] }) {
  const [anchor, setAnchor]   = useState(null);
  const [confirm, setConfirm] = useState(false);

  const openMenu  = (e) => { e.stopPropagation(); setAnchor(e.currentTarget); };
  const closeMenu = (e) => { e?.stopPropagation(); setAnchor(null); };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    closeMenu();
    setConfirm(true);
  };

  const handleConfirm = (e) => {
    e.stopPropagation();
    setConfirm(false);
    onDelete();
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setConfirm(false);
  };

  return (
    <>
      <IconButton size="small" onClick={openMenu} sx={{ color: 'text.secondary' }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 140 } } }}
      >
        {extraItems.map(({ label, icon, onClick }) => (
          <MenuItem key={label} onClick={(e) => { e.stopPropagation(); closeMenu(); onClick(); }}>
            {icon && <ListItemIcon>{icon}</ListItemIcon>}
            <ListItemText>{label}</ListItemText>
          </MenuItem>
        ))}

        <MenuItem onClick={handleDeleteClick} sx={{ color: 'text.secondary' }}>
          <ListItemIcon sx={{ color: 'text.secondary' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{S.delete}</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={confirm} onClose={handleCancel} maxWidth="xs" fullWidth>
        <DialogTitle>{S.confirmDeleteTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmMessage || S.confirmDeleteDefault}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCancel} sx={{ color: 'text.secondary' }}>{S.cancel}</Button>
          <Button variant="contained" color="error" onClick={handleConfirm}>{S.deleteButton}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
