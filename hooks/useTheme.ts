'use client';

import { useApp } from '@/context/AppContext';

// Company-based theme colors
// EV7 = Emerald Green, GI = Sapphire Blue, ALL = Emerald (default)
export interface ThemeColors {
  // Primary
  primary: string;        // e.g. '#0f5238' or '#1e3a5f'
  primaryLight: string;   // lighter variant for gradients
  primaryHover: string;   // hover state
  
  // Backgrounds
  bgSoft: string;         // very light background e.g. '#f4f9f5'
  bgCard: string;         // card/context background
  bgFooter: string;       // footer widget
  borderSoft: string;     // soft border
  
  // Badge
  badgeBg: string;        // badge background
  badgeText: string;      // badge text
  
  // Text
  textPrimary: string;    // primary colored text
  textMuted: string;      // muted colored text
  
  // Active nav
  activeNavBg: string;
  activeNavShadow: string;
  
  // Icon
  iconColor: string;
  
  // Company label
  companyLabel: string;
}

const EV7_THEME: ThemeColors = {
  primary: '#0f5238',
  primaryLight: '#2d6a4f',
  primaryHover: '#0a3d28',
  bgSoft: '#f4f9f5',
  bgCard: '#f4f9f5',
  bgFooter: '#eaf5ee',
  borderSoft: 'rgba(15, 82, 56, 0.05)',
  badgeBg: '#dcfce7',
  badgeText: '#0f5238',
  textPrimary: '#0f5238',
  textMuted: '#166534',
  activeNavBg: '#0f5238',
  activeNavShadow: '0 4px 16px rgba(15, 82, 56, 0.25)',
  iconColor: '#166534',
  companyLabel: 'EV7',
};

// Unified to EV7 emerald green theme everywhere
const GI_THEME: ThemeColors = {
  primary: '#0f5238',
  primaryLight: '#2d6a4f',
  primaryHover: '#0a3d28',
  bgSoft: '#f4f9f5',
  bgCard: '#f4f9f5',
  bgFooter: '#eaf5ee',
  borderSoft: 'rgba(15, 82, 56, 0.05)',
  badgeBg: '#dcfce7',
  badgeText: '#0f5238',
  textPrimary: '#0f5238',
  textMuted: '#166534',
  activeNavBg: '#0f5238',
  activeNavShadow: '0 4px 16px rgba(15, 82, 56, 0.25)',
  iconColor: '#166534',
  companyLabel: 'GI',
};

export function useTheme(): ThemeColors {
  const { currentCompany } = useApp();
  
  if (currentCompany === 'GI') return GI_THEME;
  return EV7_THEME; // default for 'ALL' and 'EV7'
}
