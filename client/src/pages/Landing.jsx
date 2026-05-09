import { Box, Button, Container, Grid, Link as MuiLink, Typography, Paper } from '@mui/material';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { Link, Navigate } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import { useAuth } from '../hooks/useAuth';
import S from '../strings';
import { colors, gradients, shadows } from '../theme/tokens';

/** Large-format photography — replace with your own assets under `public/` if preferred. */
const LANDING_IMAGES = {
  cta: 'women-in-scrubs.jpeg',
};

/** Mac mock pulls up into the gradient band; intro padding-bottom matches this vh so text stays clear. */
const LANDING_MAC_OVERLAP_VH = 18;

function listToLines(text) {
  return text.split('\n').filter(Boolean);
}

const BENEFIT_IMPACT_ICONS_ORDERED = [
  DeviceHubRoundedIcon,
  TuneRoundedIcon,
  TrackChangesRoundedIcon,
  AttachMoneyRoundedIcon,
  SchoolRoundedIcon,
];

/** Three titles + five `landingImpactList` lines → 8 cells (4×2 on md+). */
function buildBenefitsCellsFourByTwo(impactListText) {
  const impactLines = listToLines(impactListText);
  const titles = [S.landingBenefit1Title, S.landingBenefit2Title, S.landingBenefit3Title];
  const titleIcons = [TrendingUpRoundedIcon, SpeedRoundedIcon, GroupsRoundedIcon];
  return [
    ...titles.map((line, i) => ({ line, Icon: titleIcons[i] })),
    ...impactLines.map((line, i) => ({
      line,
      Icon: BENEFIT_IMPACT_ICONS_ORDERED[i] ?? DeviceHubRoundedIcon,
    })),
  ];
}

function BenefitGridLine({ line, Icon }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.75,
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'rgba(19, 109, 251, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <Icon sx={{ fontSize: 22, color: colors.brandBlue }} />
      </Box>
      <Typography
        variant="body1"
        color="text.primary"
        fontWeight={700}
        sx={{ lineHeight: 1.65, textWrap: 'balance', flex: 1, pt: 0.35 }}
      >
        {line}
      </Typography>
    </Box>
  );
}

export default function Landing() {
  const { user } = useAuth();

  if (user) {
    const goDash = user.roles?.includes('admin') || user.roles?.includes('accountOwner') || user.roles?.includes('doctor');
    return <Navigate to={goDash ? '/dashboard' : '/remote'} replace />;
  }

  return (
    <Box sx={{ bgcolor: colors.secondaryBackground, color: colors.textPrimary, minHeight: '100dvh' }}>
      <MarketingHeader />

      {/* Hero — text left (aligned with lg container), iPad art flush to viewport right */}
      <Box
        sx={{
          bgcolor: colors.secondaryBackground,
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          <Box
            sx={{
              flex: { md: '0 0 42%' },
              maxWidth: { md: 560 },
              px: { xs: 2, sm: 3 },
              py: { xs: 6, md: 10 },
              pl: {
                xs: 8,
                sm: 10,
                md: (theme) =>
                  `max(${theme.spacing(12)}, calc((100vw - ${theme.breakpoints.values.lg}px) / 2 + ${theme.spacing(3)} + ${theme.spacing(10)}))`,
              },
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                fontSize: { xs: '2.25rem', sm: '2.75rem', md: '3.25rem' },
                mb: 2,
                maxWidth: 560,
                textWrap: 'balance',
              }}
            >
              {S.landingHeroLine1}
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                color: colors.textSecondary,
                fontWeight: 500,
                letterSpacing: '0.01em',
                fontSize: { xs: '0.9375rem', sm: '1rem' },
                mb: 4,
                maxWidth: 560,
                lineHeight: 1.55,
                display: 'block',
              }}
            >
              {S.landingHeroKicker}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button component={Link} to="/signup" variant="contained" size="large" sx={{ textTransform: 'none', fontWeight: 700, px: 3, py: 1.25, boxShadow: 'none' }}>
                {S.landingHeroCtaPrimary}
              </Button>
              <Button
                component={MuiLink}
                href={S.landingDemoMailto}
                variant="outlined"
                size="large"
                sx={{ textTransform: 'none', fontWeight: 700, px: 3, py: 1.25 }}
              >
                {S.landingHeroCtaSecondary}
              </Button>
            </Box>
          </Box>
          <Box
            sx={{
              flex: { md: '1 1 0%' },
              minWidth: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              alignSelf: { xs: 'stretch', md: 'center' },
              pr: { md: 0 },
              pl: { xs: 2, md: 0 },
              py: { xs: 5, md: 8 },
            }}
          >
            <Box
              component="img"
              src={`${process.env.PUBLIC_URL || ''}/ipad-cut.png`}
              alt={S.landingImgAltHero}
              sx={{
                width: { xs: 'min(100%, 480px)', md: 'min(50vw, 740px)' },
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
                objectPosition: 'right center',
                ml: { xs: 'auto', md: 0 },
                mr: { xs: 'auto', md: 0 },
                flexShrink: 0,
                filter: 'drop-shadow(0 20px 40px rgba(19, 109, 251, 0.14))',
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Intro — brand gradient band; bottom padding tracks mac mock overlap */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 0,
          background: gradients.authBg,
          color: colors.white,
          pt: { xs: 10, sm: 12, md: 16 },
          pb: {
            xs: `calc(${LANDING_MAC_OVERLAP_VH}vh + 3.25rem)`,
            sm: `calc(${LANDING_MAC_OVERLAP_VH}vh + 3.75rem)`,
            md: `calc(${LANDING_MAC_OVERLAP_VH}vh + 5rem)`,
          },
          px: 2,
        }}
      >
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            component="p"
            sx={{
              fontWeight: 700,
              lineHeight: 1.45,
              letterSpacing: '-0.02em',
              color: 'inherit',
              textWrap: 'balance',
              textShadow: '0 1px 24px rgba(0,0,0,0.12)',
              fontSize: { xs: '1.375rem', sm: '1.5rem', md: '1.875rem' },
              maxWidth: 900,
              mx: 'auto',
            }}
          >
            {S.landingIntroLead}
          </Typography>
        </Container>
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          mt: `-${LANDING_MAC_OVERLAP_VH}vh`,
          width: '100%',
          pb: { xs: 2, md: 4 },
        }}
      >
        <Box
          component="img"
          src={`${process.env.PUBLIC_URL || ''}/mac-mock.png`}
          alt={S.landingImgAltMacMock}
          sx={{
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </Box>

      <Box sx={{ bgcolor: colors.secondaryBackground, pt: { xs: 6, md: 10 }, pb: { xs: 10, md: 14 } }}>
        <Box
          sx={{
            width: '90%',
            mx: 'auto',
            height: '60vh',
            minHeight: 280,
            borderRadius: { xs: 3, md: 4 },
            overflow: 'hidden',
            position: 'relative',
            boxShadow: shadows.card,
          }}
        >
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL || ''}/office-background.jpg`}
            alt={S.landingImgAltOfficeBackground}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              px: 3,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: colors.white,
                fontWeight: 700,
                letterSpacing: '0.14em',
                mb: 1.5,
              }}
            >
              {S.landingSectionHow}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                color: colors.white,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.25rem' },
                lineHeight: 1.2,
                textShadow: '0 2px 24px rgba(0,0,0,0.35)',
                maxWidth: 720,
              }}
            >
              {S.landingHowTagline}
            </Typography>
          </Box>
        </Box>

        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 2,
            mt: { xs: -5, sm: -7, md: -9 },
            px: { xs: 2, md: 3 },
          }}
        >
          <Grid container spacing={3} sx={{ width: '100%' }}>
            {[
              { Icon: TabletMacIcon, title: S.landingHow1Title, body: S.landingHow1Body },
              { Icon: DashboardRoundedIcon, title: S.landingHow2Title, body: S.landingHow2Body },
              { Icon: ArticleRoundedIcon, title: S.landingHow3Title, body: S.landingHow3Body },
            ].map(({ Icon, title, body }) => (
              <Grid size={{ xs: 12, sm: 4 }} key={title}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: 3,
                    borderRadius: 2,
                    border: `1px solid ${colors.divider}`,
                    boxShadow: shadows.cardHover,
                    bgcolor: colors.white,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'rgba(19, 109, 251, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Icon sx={{ fontSize: 28, color: colors.brandBlue }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, lineHeight: 1.35, fontSize: '1rem' }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                    {body}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits — single icon grid (titles + impact lines) */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, px: { xs: 3, sm: 4, md: 5 } }}>
        <Typography variant="h3" align="center" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 6, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
          {S.landingSectionBenefits}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
            borderLeft: `1px solid ${colors.divider}`,
          }}
        >
          {buildBenefitsCellsFourByTwo(S.landingImpactList).map((cell, idx) => (
            <Box
              key={`cell-${idx}-${cell.line}`}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRight: `1px solid ${colors.divider}`,
                borderBottom: {
                  xs: idx < 7 ? `1px solid ${colors.divider}` : 'none',
                  md: idx < 4 ? `1px solid ${colors.divider}` : 'none',
                },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
              }}
            >
              <BenefitGridLine line={cell.line} Icon={cell.Icon} />
            </Box>
          ))}
        </Box>
      </Container>

      {/* Future */}
      <Box sx={{ bgcolor: colors.white, borderTop: `1px solid ${colors.divider}` }}>
        <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 3, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            {S.landingSectionFuture}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.85 }}>
            {S.landingFutureBody}
          </Typography>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ position: 'relative', color: colors.white }}>
        <Box
          component="img"
          src={`${process.env.PUBLIC_URL || ''}/${LANDING_IMAGES.cta}`}
          alt={S.landingImgAltCta}
          sx={{
            width: '100%',
            minHeight: { xs: 380, md: 440 },
            objectFit: 'cover',
            display: 'block',
            filter: 'brightness(0.45)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 2,
            background: 'linear-gradient(180deg, rgba(3,81,204,0.5) 0%, rgba(19,109,251,0.35) 100%)',
          }}
        >
          <Container maxWidth="md">
            <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
              {S.landingCtaTitle}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.95, mb: 4 }}>
              {S.landingCtaSubtitle}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
              <Button
                component={MuiLink}
                href={S.landingDemoMailto}
                variant="contained"
                size="large"
                sx={{
                  bgcolor: colors.white,
                  color: colors.brandBlue,
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  py: 1.25,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: colors.secondaryBackground },
                }}
              >
                {S.landingCtaGetDemo}
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>

      <Box component="footer" sx={{ py: 4, borderTop: `1px solid ${colors.divider}`, bgcolor: colors.white }}>
        <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {S.landingFooterCopyright}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <MuiLink component={Link} to="/pricing" color="inherit" underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
              {S.pricingNavLink}
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
