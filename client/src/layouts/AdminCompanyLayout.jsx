import { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, IconButton, Menu, MenuItem, CircularProgress } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { Outlet, NavLink, Navigate, useParams, Link } from 'react-router-dom';
import { setApiScopeAccountId } from '../api/scope';
import { useAuth } from '../hooks/useAuth';
import { AdminCompanyProvider } from '../contexts/AdminCompanyContext';
import { getAccount } from '../api/accounts';
import { layout, gradients } from '../theme/tokens';
import BrandLogo from '../components/BrandLogo';
import S from '../strings';

const STORAGE_KEY = 'surgassist_sidebarCollapsed';

const navItems = [
  { label: S.home,        icon: <HomeIcon />,             path: '', end: true },
  { label: S.surgeries,   icon: <MedicalServicesIcon />,  path: 'surgeries', end: false },
  { label: S.patients,    icon: <PersonIcon />,           path: 'patients', end: true },
  { label: S.team,        icon: <PeopleIcon />,          path: 'team', end: true },
  { label: S.settings,    icon: <SettingsIcon />,        path: 'settings', end: true },
];

function AdminCompanyNav({ basePath, collapsed }) {
  const { user, logout } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <>
      <List sx={{ flex: 1, px: collapsed ? 0.5 : 1, pt: 1 }}>
        {navItems.map(({ label, icon, path, end }) => (
          <ListItemButton
            key={path || 'home'}
            component={NavLink}
            to={path ? `${basePath}/${path}` : basePath}
            end={end}
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
            {user?.firstName} {user?.lastName}
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
    </>
  );
}

function AdminCompanyLayoutInner() {
  const { accountId } = useParams();
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!accountId) return;
    getAccount(accountId)
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, [accountId]);

  useEffect(() => {
    setApiScopeAccountId(accountId || null);
    return () => setApiScopeAccountId(null);
  }, [accountId]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles?.includes('admin')) return <Navigate to="/login" replace />;
  if (!accountId) return <Navigate to="/admin/accounts" replace />;

  const basePath = `/admin/clinics/${accountId}`;
  const practiceName = account?.practiceName || '';
  const sidebarWidth = collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth;

  return (
    <AdminCompanyProvider accountId={accountId} practiceName={practiceName}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
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
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 0.5,
                px: 0.5,
              }}
            >
              <IconButton
                component={Link}
                to="/dashboard"
                size="small"
                sx={{
                  color: 'primary.contrastText',
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
                title="Back to account"
              >
                <ArrowBackIcon />
              </IconButton>
              {user?.accountId !== accountId && (
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: '#ed6c02',
                    color: 'rgba(0,0,0,0.5)',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    textAlign: 'center',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    minWidth: 0,
                  }}
                >
                  {collapsed ? 'Admin' : `Admin: ${practiceName || '—'}`}
                </Typography>
              )}
              <IconButton
                onClick={toggleCollapsed}
                size="small"
                sx={{
                  color: 'primary.contrastText',
                  flexShrink: 0,
                  transform: collapsed ? 'rotate(180deg)' : 'none',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <MenuOpenIcon />
              </IconButton>
            </Box>
            <Box
              component={Link}
              to={basePath}
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
          </Box>

          <AdminCompanyNav basePath={basePath} collapsed={collapsed} />
        </Drawer>

        <Box component="main" sx={{ flex: 1, bgcolor: 'background.default' }}>
          <Box sx={{ flex: 1, p: 4 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                <CircularProgress size={40} />
              </Box>
            ) : (
              <Outlet />
            )}
          </Box>
        </Box>
      </Box>
    </AdminCompanyProvider>
  );
}

export default function AdminCompanyLayout() {
  return <AdminCompanyLayoutInner />;
}
