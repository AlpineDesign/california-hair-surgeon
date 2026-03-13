// Single source of truth for all design tokens.
// Hex values are ONLY allowed in this file.

export const colors = {
  brandBlue:           '#136DFB',
  deepBlue:            '#0351CC',
  sidebarBg:           '#0D47A1',
  activeGreen:         '#16A34A',
  white:               '#FFFFFF',
  primaryBackground:   '#FFFFFF',   // card / surface background
  secondaryBackground: '#F2F7FF',   // page background behind cards
  secondaryColor:      '#F9F9F9',   // subtle alternate surface (hover rows, etc.)
  textPrimary:         '#222222',
  textSecondary:       '#666666',
  divider:             '#E5E7EB',
  error:               '#DC2626',
  todo:                '#F9A8D4',   // pink placeholder for missing data
};

export const gradients = {
  authBg: `linear-gradient(135deg, ${colors.brandBlue} 0%, ${colors.deepBlue} 100%)`,
  sidebar: `linear-gradient(180deg, ${colors.brandBlue} 0%, ${colors.sidebarBg} 100%)`,
};

export const layout = {
  sidebarMinWidth: 200,
  sidebarMaxWidth: 300,
  sidebarWidth: 'clamp(200px, 25vw, 300px)',
  sidebarCollapsedWidth: 80,
};

export const radius = {
  card:   8,
  button: 6,
  chip:   16,
};

export const shadows = {
  card: '0px 2px 8px rgba(0, 0, 0, 0.06)',
  cardHover: '0px 4px 16px rgba(0, 0, 0, 0.10)',
};
