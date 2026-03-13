import { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Link as MuiLink } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/BrandLogo';
import S from '../../strings';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError(S.passwordsMismatch);
    setError('');
    setLoading(true);
    try {
      await signup({ firstName: form.firstName, lastName: form.lastName, username: form.username, email: form.email, password: form.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || S.signUpError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%', maxWidth: 480 }}>
      <BrandLogo dark size="lg" />

      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{S.createAccount}</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label={S.firstName} name="firstName" value={form.firstName} onChange={handleChange} fullWidth required />
              <TextField label={S.lastName} name="lastName" value={form.lastName} onChange={handleChange} fullWidth required />
            </Box>
            <TextField label={S.username} name="username" value={form.username} onChange={handleChange} fullWidth required />
            <TextField label={S.email} name="email" type="email" value={form.email} onChange={handleChange} fullWidth required />
            <TextField label={S.password} name="password" type="password" value={form.password} onChange={handleChange} fullWidth required />
            <TextField label={S.confirmPassword} name="confirm" type="password" value={form.confirm} onChange={handleChange} fullWidth required />
            {error && <Typography color="error" variant="body2">{error}</Typography>}
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? S.signUpLoading : S.signUp}
            </Button>
            <Typography variant="body2" textAlign="center">
              {S.hasAccount}{' '}
              <MuiLink component={Link} to="/login" fontWeight={600}>{S.loginLink}</MuiLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
