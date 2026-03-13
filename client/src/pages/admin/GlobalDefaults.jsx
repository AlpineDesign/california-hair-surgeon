import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import { getDefaults, updateDefaults } from '../../api/accounts';
import useAutoSave from '../../hooks/useAutoSave';
import PageHeader from '../../components/PageHeader';
import SaveStatus from '../../components/SaveStatus';
import ApplicationSettingsEditor from '../../components/ApplicationSettingsEditor';
import S from '../../strings';

export default function GlobalDefaults() {
  const [ready, setReady] = useState(false);
  const [defaults, setDefaults] = useState({
    graftButtons: [],
    hairTypes: [], hairColors: [], hairCalibers: [], skinColors: [],
    fueDevices: [], fueTipStyles: [], fueTipSizes: [],
    holdingSolutions: [], placingDevices: [],
  });

  const { status } = useAutoSave(
    defaults,
    (data) => updateDefaults(data),
    { delay: 500, enabled: ready },
  );

  const loadDefaults = useCallback(async () => {
    try {
      const data = await getDefaults();
      setDefaults({
        graftButtons: data.graftButtons || [],
        hairTypes: data.hairTypes || [],
        hairColors: data.hairColors || [],
        hairCalibers: data.hairCalibers || [],
        skinColors: data.skinColors || [],
        fueDevices: data.fueDevices || [],
        fueTipStyles: data.fueTipStyles || [],
        fueTipSizes: data.fueTipSizes || [],
        holdingSolutions: data.holdingSolutions || [],
        placingDevices: data.placingDevices || [],
      });
    } catch (err) {
      console.error('Failed to load defaults', err);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  const handleDataChange = (key, value) => {
    setDefaults((d) => ({ ...d, [key]: value }));
  };

  return (
    <Box>
      <PageHeader title={S.defaultsTitle} />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {S.defaultsDescription}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            {S.applicationTitle}
          </Typography>
          <SaveStatus status={status} />
        </Box>
        <Divider sx={{ mb: 3 }} />

        <ApplicationSettingsEditor
          mode="defaults"
          data={defaults}
          onDataChange={handleDataChange}
        />
      </Paper>
    </Box>
  );
}
