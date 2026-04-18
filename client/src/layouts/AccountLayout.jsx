import { useState } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, IconButton, Menu, MenuItem } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import TuneIcon from '@mui/icons-material/Tune';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { Outlet, NavLink, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { layout, gradients } from '../theme/tokens';
import BrandLogo from '../components/BrandLogo';
import S from '../strings';

const STORAGE_KEY = 'surgassist_sidebarCollapsed';

const navItems = [
  { label: S.home,        icon: <HomeIcon />,             path: '/dashboard' },
  { label: S.surgeries,   icon: <MedicalServicesIcon />,  path: '/dashboard/surgeries' },
  { label: S.patients,    icon: <PersonIcon />,           path: '/dashboard/patients' },
  { label: S.team,        icon: <PeopleIcon />,           path: '/dashboard/team' },
  { label: S.settings,    icon: <SettingsIcon />,         path: '/dashboard/settings' },
];

const adminNavItems = [
  { label: S.adminSurgeriesTitle, icon: <MedicalServicesIcon />, path: '/admin/surgeries' },
  { label: S.companiesTitle,      icon: <BusinessIcon />,        path: '/admin/accounts' },
  { label: S.defaultsTitle,       icon: <TuneIcon />,            path: '/admin/defaults' },
];

export default function AccountLayout() {
  const { user, logout } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const location = useLocation();
  const isSurgeryDetail = /^\/dashboard\/surgeries\/[^/]+$/.test(location.pathname);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes('accountOwner') && !user.roles.includes('admin') && !user.roles.includes('doctor')) return <Navigate to="/login" replace />;
  if (location.pathname.startsWith('/admin/') && !user.roles?.includes('admin')) return <Navigate to="/dashboard" replace />;

  const sidebarWidth = collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth;
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {!isSurgeryDetail && (
      <Drawer
        variant="permanent"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            minWidth: collapsed ? layout.sidebarCollapsedWidth : layout.sidebarMinWidth,
            maxWidth: collapsed ? layout.sidebarCollapsedWidth : layout.sidebarMaxWidth,
            boxSizing: 'border-box',
            background: gradients.sidebar,
            color: 'primary.contrastText',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            transition: 'width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease',
          },
        }}
      >
        <Box sx={{ p: collapsed ? 1.5 : 2.5, pt: collapsed ? 4 : 5, pb: collapsed ? 3 : 4, mb: 2, textAlign: 'center', boxShadow: '0 10px 10px 0 #00000026', position: 'relative' }}>
          <Box
            component={Link}
            to="/dashboard"
            aria-label={S.home}
            sx={{
              display: 'inline-block',
              lineHeight: 0,
              borderRadius: 1,
              color: 'inherit',
              textDecoration: 'none',
              '&:focus-visible': { outline: '2px solid rgba(255,255,255,0.6)', outlineOffset: 2 },
            }}
          >
            <BrandLogo dark size="sm" iconOnly={collapsed} />
          </Box>
          <IconButton
            onClick={toggleCollapsed}
            size="small"
            sx={{
              position: 'absolute',
              right: 4,
              top: 4,
              color: 'primary.contrastText',
              transform: collapsed ? 'rotate(180deg)' : 'none',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <MenuOpenIcon />
          </IconButton>
        </Box>

        <List sx={{ flex: 1, px: collapsed ? 0.5 : 1, pt: 1, overflow: 'auto' }}>
          {navItems.map(({ label, icon, path }) => (
            <ListItemButton
              key={path}
              component={NavLink}
              to={path}
              end={path === '/dashboard'}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: 'primary.contrastText',
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2,
                '&.active': { bgcolor: 'primary.main' },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 36, justifyContent: 'center' }}>
                {icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={label} />}
            </ListItemButton>
          ))}
          {user.roles?.includes('admin') && (
            <>
              <Box sx={{ height: 16, flexShrink: 0 }} />
              {!collapsed && (
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    px: 2,
                    py: 0.5,
                    color: 'primary.contrastText',
                    opacity: 0.8,
                    letterSpacing: '0.1em',
                  }}
                >
                  Admin
                </Typography>
              )}
              {adminNavItems.map(({ label, icon, path }) => (
                <ListItemButton
                  key={path}
                  component={NavLink}
                  to={path}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    color: 'primary.contrastText',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 1 : 2,
                    '&.active': { bgcolor: 'primary.main' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 36, justifyContent: 'center' }}>
                    {icon}
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={label} />}
                </ListItemButton>
              ))}
            </>
          )}
        </List>

        <Box
          onClick={(e) => !e.target.closest('a') && setUserMenuAnchor(e.currentTarget)}
          sx={{
            p: collapsed ? 1.5 : 2,
            py: collapsed ? 1.25 : 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1,
            cursor: 'pointer',
            borderRadius: 1,
            mx: 0.5,
            mb: 0.5,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, flexShrink: 0 }}>
            {initials}
          </Avatar>
          {!collapsed && (
            <Typography variant="body2" sx={{ color: 'primary.contrastText', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {user.firstName} {user.lastName}
            </Typography>
          )}
        </Box>
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                width: userMenuAnchor?.offsetWidth,
                minWidth: 120,
              },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null);
              logout();
            }}
          >
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            {S.logout}
          </MenuItem>
        </Menu>
      </Drawer>
      )}

      <Box component="main" sx={{ flex: 1, bgcolor: 'background.default', p: isSurgeryDetail ? 0 : 4, width: isSurgeryDetail ? '100%' : undefined }}>
        <Outlet />
      </Box>
    </Box>
  );
}
