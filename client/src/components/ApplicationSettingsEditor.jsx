import { Box, Typography, Button } from '@mui/material';
import GraftButtonRow from './GraftButtonRow';
import SettingRow from './SettingRow';
import S from '../strings';

const APP_SETTINGS_FIELDS = [
  { key: 'hairTypes',        type: 'hairType',        label: S.hairTypes },
  { key: 'hairColors',       type: 'hairColor',       label: S.hairColors },
  { key: 'hairCalibers',     type: 'hairCaliber',     label: S.hairCalibers },
  { key: 'skinColors',       type: 'skinColor',       label: S.skinColors },
  { key: 'fueDevices',       type: 'fueDevice',       label: S.fueDevices },
  { key: 'fueTipStyles',     type: 'fueTipStyle',     label: S.fueTipStyles },
  { key: 'fueTipSizes',      type: 'fueTipSize',     label: S.fueTipSizes },
  { key: 'holdingSolutions', type: 'holdingSolution', label: S.holdingSolutions },
  { key: 'placingDevices',   type: 'placingDevice',   label: S.placingDevices },
];

/**
 * Shared application settings UI for Account Settings and Admin Global Defaults.
 * Same layout: option rows (hair types, fue devices, etc.) + graft buttons.
 *
 * Props:
 *   mode           'account' | 'defaults'
 *   data           { graftButtons, hairTypes, ... } — shape depends on mode
 *   onDataChange   (key, value) => void — for defaults mode
 *   onGraftChange  (graftButtons) => void — for account mode (graft buttons only)
 *   onRefetch      () => void — for account mode (after option edits)
 *   onMigrate      () => void — account mode only, when no options
 *   migrating      boolean — account mode only
 */
export default function ApplicationSettingsEditor({
  mode,
  data = {},
  onDataChange,
  onGraftChange,
  onRefetch,
  onMigrate,
  migrating = false,
}) {
  const isDefaults = mode === 'defaults';
  const graftButtons = data.graftButtons || [];

  const handleGraftChange = (btns) => {
    if (isDefaults) onDataChange?.('graftButtons', btns);
    else onGraftChange?.(btns);
  };

  const hasAnyOptions = APP_SETTINGS_FIELDS.some(({ key }) => (data[key]?.length ?? 0) > 0);

  return (
    <Box>
      {!isDefaults && !hasAnyOptions && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {S.migrateHelper}
          </Typography>
          <Button variant="outlined" size="small" onClick={onMigrate} disabled={migrating}>
            {migrating ? S.migrating : S.migrateButton}
          </Button>
        </Box>
      )}
      <Box sx={{ mx: -2.5, mt: -1.75 }}>
        {APP_SETTINGS_FIELDS.filter((f) => !isDefaults || f.showInDefaults !== false).map(({ key, type, label }) => (
          <SettingRow
            key={key}
            label={label}
            type={type}
            items={data[key] || []}
            variant={mode}
            onRefetch={onRefetch}
            onChange={isDefaults ? (items) => onDataChange?.(key, items) : undefined}
          />
        ))}
        <GraftButtonRow buttons={graftButtons} onChange={handleGraftChange} />
      </Box>
    </Box>
  );
}
