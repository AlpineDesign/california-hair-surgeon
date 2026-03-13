/**
 * Seed a new account with settings from GlobalDefaults.
 * Called when an account is created (signup) so new accounts start with sensible defaults.
 * Each account can fully customize their settings after creation.
 */
const { Parse } = require('../parse');

const OPTION_TYPES = [
  'hairType', 'hairColor', 'hairCaliber', 'skinColor',
  'fueDevice', 'fueTipStyle', 'fueTipSize',
  'holdingSolution', 'placingDevice',
];

const TYPE_TO_KEY = {
  hairType: 'hairTypes', hairColor: 'hairColors', hairCaliber: 'hairCalibers', skinColor: 'skinColors',
  fueDevice: 'fueDevices', fueTipStyle: 'fueTipStyles', fueTipSize: 'fueTipSizes',
  holdingSolution: 'holdingSolutions', placingDevice: 'placingDevices',
};

async function seedAccountFromDefaults(accountId) {
  const GlobalDefaults = Parse.Object.extend('GlobalDefaults');
  const Option = Parse.Object.extend('Option');

  const defaultsQuery = new Parse.Query(GlobalDefaults);
  const defaults = await defaultsQuery.first({ useMasterKey: true });

  // 1. Create graftButton Option records from GlobalDefaults
  const graftButtons = defaults?.get('graftButtons');
  if (Array.isArray(graftButtons) && graftButtons.length > 0) {
    const { saveGraftButtonsForAccount } = require('../routes/options');
    await saveGraftButtonsForAccount(accountId, graftButtons);
  }

  // 2. Create Option records from default label arrays
  for (const optionType of OPTION_TYPES) {
    const key = TYPE_TO_KEY[optionType];
    const labels = defaults?.get(key) || [];
    if (!Array.isArray(labels) || labels.length === 0) continue;

    const existingQuery = new Parse.Query(Option);
    existingQuery.equalTo('accountId', accountId);
    existingQuery.equalTo('type', optionType);
    const existing = await existingQuery.find({ useMasterKey: true });
    const existingLabels = new Set(existing.map((o) => o.get('label')));

    for (let i = 0; i < labels.length; i++) {
      const label = String(labels[i]).trim();
      if (!label || existingLabels.has(label)) continue;
      const opt = new Option();
      opt.set('accountId', accountId);
      opt.set('type', optionType);
      opt.set('label', label);
      opt.set('sortOrder', i);
      await opt.save(null, { useMasterKey: true });
      existingLabels.add(label);
    }
  }
}

module.exports = { seedAccountFromDefaults };
