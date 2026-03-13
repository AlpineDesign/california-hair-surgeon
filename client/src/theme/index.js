import { createTheme } from '@mui/material/styles';
import { colors, radius, shadows } from './tokens';

const theme = createTheme({
  palette: {
    primary: {
      main:  colors.brandBlue,
      dark:  colors.deepBlue,
      contrastText: colors.white,
    },
    success: {
      main: colors.activeGreen,
      contrastText: colors.white,
    },
    error: {
      main: colors.error,
    },
    text: {
      primary:   colors.textPrimary,
      secondary: colors.textSecondary,
    },
    action: {
      hover: colors.secondaryColor,
    },
    background: {
      default: colors.secondaryBackground,
      paper:   colors.primaryBackground,
    },
    divider: colors.divider,
  },
  shape: {
    borderRadius: radius.card,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    caption: {
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontWeight: 500,
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        InputLabelProps: { shrink: true },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.button,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover':  { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
          '&:focus':  { boxShadow: 'none' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.brandBlue,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radius.chip },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: shadows.card,
        },
      },
    },
    MuiLink: {
      defaultProps: {
        underline: 'none',
      },
    },
  },
});

export default theme;
