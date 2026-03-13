import { Box, Typography } from '@mui/material';

/**
 * Surg Assist logo + wordmark.
 * Props:
 *   dark     {bool} — white text variant for colored backgrounds (auth screen, sidebar)
 *   size     {'sm'|'md'|'lg'} — controls icon + text size
 *   iconOnly {bool} — show only the icon (for collapsed sidebar)
 */
export default function BrandLogo({ dark = false, size = 'md', iconOnly = false }) {
  const iconSize = iconOnly ? 36 : { sm: '40%', md: 52, lg: 72 }[size];
  const color = dark ? 'primary.contrastText' : 'text.primary';

  if (iconOnly) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          component="img"
          src="/icon.png"
          alt="Surg Assist"
          sx={{ width: iconSize, height: 'auto', objectFit: 'contain' }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        component="img"
        src="/icon.png"
        alt="Surg Assist"
        sx={{ width: iconSize, height: 'auto', objectFit: 'contain' }}
      />
      <Typography
        variant={size === 'lg' ? 'h5' : 'subtitle1'}
        sx={{ color, fontWeight: 700, letterSpacing: 1, lineHeight: 1 }}
      >
        SURG <Box component="span" sx={{ fontWeight: 300 }}>ASSIST</Box>
      </Typography>
      <Typography variant="caption" sx={{ color, opacity: 0.7, lineHeight: 1 }}>
        By California Hair Surgeon
      </Typography>
    </Box>
  );
}
