import { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Link as MuiLink } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/BrandLogo';
import S from '../../strings';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      if (user.roles.includes('admin') || user.roles.includes('accountOwner') || user.roles.includes('doctor')) {
        navigate('/dashboard');
      } else {
        navigate('/remote');
      }
    } catch (err) {
      setError(err.response?.data?.error || S.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%', maxWidth: 480 }}>
      <BrandLogo dark size="lg" />

      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={S.username}
              name="username"
              value={form.username}
              onChange={handleChange}
              fullWidth
              required
              autoComplete="username"
            />
            <TextField
              label={S.password}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              required
              autoComplete="current-password"
            />
            {error && <Typography color="error" variant="body2">{error}</Typography>}
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? S.loginLoading : S.login}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                {S.noAccount}{' '}
                <MuiLink component={Link} to="/signup" fontWeight={600}>{S.signUpLink}</MuiLink>
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {S.loginIssues}{' '}
                <MuiLink component={Link} to="/forgot-password" fontWeight={600}>{S.resetPasswordLink}</MuiLink>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
