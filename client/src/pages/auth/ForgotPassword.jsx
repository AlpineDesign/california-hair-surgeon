import { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import BrandLogo from '../../components/BrandLogo';
import S from '../../strings';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || S.requestFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%', maxWidth: 480 }}>
      <BrandLogo dark size="lg" />

      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {sent ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>{S.checkYourEmail}</Typography>
              <Typography variant="body2" color="text.secondary">
                {S.resetEmailSent}
              </Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6">{S.resetPassword}</Typography>
              <TextField label={S.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required />
              {error && <Typography color="error" variant="body2">{error}</Typography>}
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                {loading ? S.sending : S.sendResetLink}
              </Button>
            </Box>
          )}
          <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
            <MuiLink component={Link} to="/login">{S.backToLogin}</MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
