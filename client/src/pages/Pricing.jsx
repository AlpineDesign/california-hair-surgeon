import { Box, Button, Container, Link as MuiLink, Paper, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import S from '../strings';
import { colors } from '../theme/tokens';

const FEATURES = [
  S.pricingFeatureTechnicians,
  S.pricingFeatureSurgeries,
  S.pricingFeatureBranding,
  S.pricingFeatureDefaults,
  S.pricingFeatureDashboards,
];

export default function Pricing() {
  return (
    <Box sx={{ bgcolor: colors.secondaryBackground, color: colors.textPrimary, minHeight: '100dvh' }}>
      <MarketingHeader />

      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 }, px: 2 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.03em',
            mb: 1,
            fontSize: { xs: '1.85rem', sm: '2.25rem' },
            textAlign: 'center',
            textWrap: 'balance',
          }}
        >
          {S.pricingHeadline}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, lineHeight: 1.7, textAlign: 'center', textWrap: 'balance', maxWidth: 440, mx: 'auto' }}
        >
          {S.pricingIntro}
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
            border: `1px solid ${colors.divider}`,
            boxShadow: '0px 8px 32px rgba(19, 109, 251, 0.08)',
            bgcolor: colors.white,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: colors.brandBlue, mb: 0.5 }}>
            {S.pricingTrial}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 3, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
            {S.pricingRate}
          </Typography>

          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, mb: 4 }}>
            {FEATURES.map((label) => (
              <Box
                key={label}
                component="li"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  py: 1.25,
                  borderTop: `1px solid ${colors.divider}`,
                  '&:first-of-type': { borderTop: 'none', pt: 0 },
                }}
              >
                <CheckCircleRoundedIcon sx={{ color: colors.activeGreen, fontSize: 22, mt: '2px', flexShrink: 0 }} aria-hidden />
                <Typography variant="body1" sx={{ lineHeight: 1.55 }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Button
            component={MuiLink}
            href={S.landingDemoMailto}
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 1.25,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: colors.brandBlue,
              boxShadow: 'none',
              '&:hover': { bgcolor: colors.deepBlue, boxShadow: 'none' },
            }}
          >
            {S.landingHeroCtaSecondary}
          </Button>
        </Paper>
      </Container>

      <Box component="footer" sx={{ py: 4, borderTop: `1px solid ${colors.divider}`, bgcolor: colors.white, mt: 'auto' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {S.landingFooterCopyright}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <MuiLink component={Link} to="/pricing" color="inherit" underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
              {S.pricingNavLink}
            </MuiLink>
            <MuiLink component={Link} to="/" color="inherit" underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
              {S.pricingFooterHome}
            </MuiLink>
            <MuiLink component={Link} to="/login" color="inherit" underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
              {S.landingHeaderLogin}
            </MuiLink>
            <MuiLink component={Link} to="/signup" color="inherit" underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
              {S.landingHeaderSignup}
            </MuiLink>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
