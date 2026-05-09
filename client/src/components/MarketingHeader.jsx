import { Box, Button, Container } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import S from '../strings';
import { colors } from '../theme/tokens';

const HEADER_LOGO_H = 40;

export default function MarketingHeader() {
  const { pathname } = useLocation();
  const onPricing = pathname === '/pricing';

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        bgcolor: colors.white,
      }}
    >
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, gap: 2 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL || ''}/logo-wide.png`}
            alt={S.landingProductName}
            sx={{
              height: HEADER_LOGO_H,
              width: 'auto',
              maxWidth: { xs: 'min(200px, 52vw)', sm: 260 },
              display: 'block',
              flexShrink: 0,
              objectFit: 'contain',
              objectPosition: 'left center',
            }}
          />
        </Link>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button
            component={Link}
            to="/pricing"
            color="inherit"
            sx={{
              color: onPricing ? colors.brandBlue : colors.textPrimary,
              fontWeight: onPricing ? 800 : 600,
              textTransform: 'none',
              textDecoration: onPricing ? 'underline' : 'none',
              textUnderlineOffset: 4,
            }}
          >
            {S.pricingNavLink}
          </Button>
          <Button
            component={Link}
            to="/login"
            color="inherit"
            sx={{ color: colors.textPrimary, fontWeight: 600, textTransform: 'none' }}
          >
            {S.landingHeaderLogin}
          </Button>
          <Button
            component={Link}
            to="/signup"
            variant="contained"
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: 'none',
              px: { xs: 2, sm: 2.5 },
              bgcolor: colors.brandBlue,
              color: colors.white,
              '&:hover': { bgcolor: colors.deepBlue, boxShadow: 'none' },
            }}
          >
            {S.landingHeaderSignup}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
