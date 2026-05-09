import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Link as MuiLink, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import S from '../strings';
import { getTermsPdfUrl } from '../constants/terms';
import { colors } from '../theme/tokens';

const SCROLL_END_THRESHOLD_PX = 56;
/** Tall iframe so the outer panel scrolls in browsers that lay out PDF height; internal PDF scrollers still require reading in-frame. */
const IFRAME_DOC_HEIGHT_PX = 3600;

export default function SignupTermsGate({ onAccepted }) {
  const scrollRef = useRef(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const evaluateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + SCROLL_END_THRESHOLD_PX) {
      setScrolledToBottom(true);
      return;
    }
    setScrolledToBottom(scrollHeight - scrollTop - clientHeight <= SCROLL_END_THRESHOLD_PX);
  }, []);

  useEffect(() => {
    evaluateScroll();
    window.addEventListener('resize', evaluateScroll);
    return () => window.removeEventListener('resize', evaluateScroll);
  }, [evaluateScroll]);

  const pdfUrl = getTermsPdfUrl();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%', maxWidth: 560 }}>
      <BrandLogo dark size="lg" />
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{S.authTermsTitle}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {S.authTermsIntro}
          </Typography>

          <Box
            ref={scrollRef}
            onScroll={evaluateScroll}
            sx={{
              maxHeight: { xs: 320, sm: 420 },
              overflow: 'auto',
              border: `1px solid ${colors.divider}`,
              borderRadius: 1,
              bgcolor: 'background.paper',
              mb: 2,
            }}
          >
            <Box
              component="iframe"
              title={S.authTermsPdfTitle}
              src={`${pdfUrl}#toolbar=0`}
              sx={{
                width: '100%',
                height: IFRAME_DOC_HEIGHT_PX,
                border: 0,
                display: 'block',
              }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            {S.authTermsScrollHint}
          </Typography>
          <MuiLink href={pdfUrl} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'inline-block', mb: 2 }}>
            {S.authTermsOpenPdf}
          </MuiLink>

          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={!scrolledToBottom}
            onClick={onAccepted}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {S.authTermsAcceptContinue}
          </Button>
          <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
            {S.hasAccount}{' '}
            <MuiLink component={Link} to="/login" fontWeight={600}>{S.loginLink}</MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
