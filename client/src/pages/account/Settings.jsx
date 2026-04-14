import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Grid,
  Divider, InputAdornment, CircularProgress,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import useAutoSave from '../../hooks/useAutoSave';
import { updateMe, updateUser } from '../../api/users';
import { updateMyAccount, uploadLogo } from '../../api/accounts';
import { getSettings, getOptions, updateOptions } from '../../api/settings';
import { migrateOptions } from '../../api/options';
import ResetOwnPasswordModal from '../../components/ResetOwnPasswordModal';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PageHeader from '../../components/PageHeader';
import ApplicationSettingsEditor from '../../components/ApplicationSettingsEditor';
import SaveStatus from '../../components/SaveStatus';
import S from '../../strings';
import { useAdminCompany } from '../../contexts/AdminCompanyContext';

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, description, saveStatus, children }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        <SaveStatus status={saveStatus} />
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Paper>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth();
  const adminCompany = useAdminCompany();
  /** Staff doctors (not clinic owner / admin): personal settings only. */
  const doctorLimited =
    user?.roles?.includes('doctor') && !user?.roles?.includes('accountOwner') && !user?.roles?.includes('admin');
  const [ownerUserId, setOwnerUserId] = useState(null);
  const [ready, setReady] = useState(false);

  // ── Personal ──────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({ username: '', firstName: '', lastName: '', email: '', phone: '' });
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  // ── Company ───────────────────────────────────────────────────────────────
  const [company, setCompany] = useState({
    practiceName: '', logoUrl: '', website: '', email: '', phone: '', address: '',
  });

  // ── Application settings (Options API + graftButtons) ─────────────────────
  const [optionsData, setOptionsData] = useState({
    hairTypes: [], hairColors: [], hairCalibers: [], skinColors: [],
    fueDevices: [], fueTipStyles: [], fueTipSizes: [],
    holdingSolutions: [], placingDevices: [], graftButtons: [],
  });

  // ── Auto-save hooks ───────────────────────────────────────────────────────
  const savePersonal = useCallback(
    (data) => {
      if (ownerUserId) return updateUser(ownerUserId, data);
      return updateMe(data);
    },
    [ownerUserId],
  );

  const { status: personalStatus } = useAutoSave(
    personal,
    savePersonal,
    {
      enabled:
        ready
        && (!adminCompany?.accountId || !!ownerUserId),
    },
  );

  const { status: companyStatus } = useAutoSave(
    company,
    (data) => updateMyAccount(data),
    { enabled: ready && !doctorLimited },
  );

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState(null);
  const LOGO_MAX_BYTES = 5 * 1024 * 1024;
  const [migrating, setMigrating] = useState(false);
  const logoInputRef = useRef(null);

  const [optionsReady, setOptionsReady] = useState(false);
  const { status: graftStatus } = useAutoSave(
    optionsData.graftButtons,
    (graftButtons) => updateOptions({ graftButtons }),
    { delay: 400, enabled: ready && optionsReady && !doctorLimited },
  );

  // ── Seed personal from auth context ──────────────────────────────────────
  useEffect(() => {
    if (user && !adminCompany?.accountId) {
      setOwnerUserId(null);
      setPersonal({
        username:  user.username  || '',
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        email:     user.email     || '',
        phone:     user.phone     || '',
      });
    }
  }, [user, adminCompany?.accountId]);

  // ── Load company from API ─────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (doctorLimited && !adminCompany?.accountId) {
      setReady(true);
      return;
    }
    try {
      const data = await getSettings();
      if (data) {
        const {
          practiceName = '', logoUrl = '', website = '', email = '', phone = '',
          address = '', street = '', city = '', state = '', zip = '',
        } = data;
        const resolvedAddress = address || [street, city, state, zip].filter(Boolean).join(', ');
        setCompany({ practiceName, logoUrl, website, email, phone, address: resolvedAddress });
        if (adminCompany?.accountId && data.owner?.id) {
          setOwnerUserId(data.owner.id);
          setPersonal({
            username: data.owner.username || '',
            firstName: data.owner.firstName || '',
            lastName: data.owner.lastName || '',
            email: data.owner.email || '',
            phone: data.owner.phone || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setReady(true);
    }
  }, [adminCompany?.accountId, doctorLimited]);

  // ── Load options + graft buttons from API ─────────────────────────────────
  const loadOptions = useCallback(async () => {
    try {
      const data = await getOptions();
      if (data) {
        setOptionsData({
          hairTypes: data.hairTypes || [],
          hairColors: data.hairColors || [],
          hairCalibers: data.hairCalibers || [],
          skinColors: data.skinColors || [],
          fueDevices: data.fueDevices || [],
          fueTipStyles: data.fueTipStyles || [],
          fueTipSizes: data.fueTipSizes || [],
          holdingSolutions: data.holdingSolutions || [],
          placingDevices: data.placingDevices || [],
          graftButtons: data.graftButtons || [],
        });
      }
    } catch (err) {
      console.error('Failed to load options', err);
    } finally {
      setOptionsReady(true);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => {
    if (doctorLimited) return;
    loadOptions();
  }, [loadOptions, doctorLimited]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePersonalChange = (e) => setPersonal((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleCompanyChange  = (e) => setCompany((c)  => ({ ...c, [e.target.name]: e.target.value }));

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateOptions();
      if (result?.migrated > 0) await loadOptions();
    } catch (err) {
      console.error('Migration failed', err);
    } finally {
      setMigrating(false);
    }
  };

  const handleOpenResetPassword = () => setResetPasswordOpen(true);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(S.logoTooLarge);
      e.target.value = '';
      return;
    }
    setLogoUploading(true);
    try {
      const url = await uploadLogo(file);
      setCompany((c) => ({ ...c, logoUrl: url }));
    } catch (err) {
      console.error('Failed to upload logo', err);
      const serverMsg = err.response?.data?.error;
      setLogoError(typeof serverMsg === 'string' ? serverMsg : S.logoUploadFailed);
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const adminOnlyNoClinic =
    user?.roles?.includes('admin')
    && !user?.roles?.includes('accountOwner')
    && !adminCompany?.accountId;

  if (adminOnlyNoClinic) {
    return (
      <Box>
        <PageHeader title={S.settingsTitle} />
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {S.settingsAdminUseClinicsList}
          </Typography>
          <Button component={Link} to="/admin/accounts" variant="contained">
            {S.accounts}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title={S.settingsTitle} />

      {/* ── Personal ────────────────────────────────────────────────────── */}
      <Section title={S.personalTitle} description={S.personalDescription} saveStatus={personalStatus}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField label={S.username} name="username" fullWidth value={personal.username} onChange={handlePersonalChange} />
          </Grid>
          <Grid item xs={12} sm={6} />
          <Grid item xs={12} sm={6}>
            <TextField label={S.firstName} name="firstName" fullWidth value={personal.firstName} onChange={handlePersonalChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label={S.lastName}  name="lastName"  fullWidth value={personal.lastName}  onChange={handlePersonalChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={S.email} name="email" type="email" fullWidth
              value={personal.email} onChange={handlePersonalChange}
              helperText={S.emailHelper}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label={S.phone} name="phone" fullWidth value={personal.phone} onChange={handlePersonalChange} />
          </Grid>
          {!adminCompany?.accountId && (
            <Grid item xs={12} sm={6}>
              <TextField
                label={S.password}
                type="password"
                fullWidth
                value="••••••••••••"
                disabled
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleOpenResetPassword}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {S.resetButton}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}
        </Grid>
      </Section>

      {/* ── Company ─────────────────────────────────────────────────────── */}
      {!doctorLimited && (
      <Section title={S.companyTitle} description={S.companyDescription} saveStatus={companyStatus}>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>

          {/* ── Form fields (2/3) */}
          <Box sx={{ flex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
            <TextField
              label={S.practiceName} name="practiceName" fullWidth
              value={company.practiceName} onChange={handleCompanyChange}
            />
            <TextField
              label={S.website} name="website" fullWidth
              value={company.website} onChange={handleCompanyChange}
            />
            <TextField
              label={S.phone} name="phone" fullWidth
              value={company.phone} onChange={handleCompanyChange}
            />
            <TextField
              label={S.email} name="email" type="email" fullWidth
              value={company.email} onChange={handleCompanyChange}
            />
            <TextField
              label={S.address} name="address" fullWidth multiline rows={3}
              value={company.address} onChange={handleCompanyChange}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>

          {/* ── Logo panel (1/3) */}
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
              {S.clinicLogo}
            </Typography>
            <Box
              onClick={() => {
                if (!ready || logoUploading) return;
                logoInputRef.current?.click();
              }}
              sx={{
                width: '100%',
                height: 200,
                boxSizing: 'border-box',
                bgcolor: 'background.paper',
                border: '2px dashed',
                borderColor: logoError ? 'error.light' : 'grey.400',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                px: 2,
                py: 2,
                cursor: !ready || logoUploading ? 'default' : 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s',
                '&:hover':
                  !ready || logoUploading
                    ? {}
                    : { borderColor: logoError ? 'error.main' : 'grey.600', bgcolor: 'grey.50' },
              }}
            >
              {!ready ? (
                <>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {S.loading}
                  </Typography>
                </>
              ) : logoUploading ? (
                <>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {S.uploadingLogo}
                  </Typography>
                </>
              ) : logoError ? (
                <>
                  <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                  <Typography
                    variant="body2"
                    color="error"
                    align="center"
                    sx={{ wordBreak: 'break-word', maxWidth: '100%' }}
                  >
                    {logoError}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, textAlign: 'center' }}>
                    {S.logoTapToRetry}
                  </Typography>
                </>
              ) : company.logoUrl ? (
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    component="img"
                    src={company.logoUrl}
                    alt={S.practiceLogoAlt}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      display: 'block',
                    }}
                  />
                </Box>
              ) : (
                <>
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                  <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    {S.logoNoLogoYet}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    {S.logoFileTypes}
                  </Typography>
                </>
              )}
            </Box>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
            {ready && company.logoUrl && !logoUploading && !logoError && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => logoInputRef.current?.click()}
                sx={{ mt: 1.5 }}
              >
                {S.updateLogo}
              </Button>
            )}
          </Box>

        </Box>
      </Section>
      )}

      {/* ── Application Settings ─────────────────────────────────────────── */}
      {!doctorLimited && (
      <Section title={S.applicationTitle} description={S.applicationDescription} saveStatus={graftStatus}>
        <ApplicationSettingsEditor
          mode="account"
          data={optionsData}
          onGraftChange={(btns) => setOptionsData((s) => ({ ...s, graftButtons: btns }))}
          onRefetch={loadOptions}
          onMigrate={handleMigrate}
          migrating={migrating}
        />
      </Section>
      )}

      {!adminCompany?.accountId && (
        <ResetOwnPasswordModal
          open={resetPasswordOpen}
          onClose={() => setResetPasswordOpen(false)}
        />
      )}
    </Box>
  );
}
