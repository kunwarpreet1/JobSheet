import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const isTablet = width >= 768;

/**
 * Skinnish Warm Ambient Gradient Design Tokens (2026 Warm Nude Aesthetic)
 */
export const COLORS = {
  // Skinnish Warm Ambient Background Gradients & Surfaces
  bgGradientStart: '#FFFBF7',
  bgGradientMiddle: '#FDF3EC',
  bgGradientEnd: '#FFFFFF',
  bgLight: '#FFFBF7',
  cardBg: '#FFFFFF',
  cardBorder: '#F5E6DC',

  // Primary Action Accent (Warm Terracotta / Indigo Nude)
  primary: '#2D2321',
  primaryDark: '#1A1413',
  accent: '#E07A5F',
  accentHover: '#C8674E',
  accentLight: '#FDF3EC',

  // Employee Accent (Warm Soft Sage / Muted Teal)
  employeeAccent: '#52796F',
  employeeLight: '#EDF4F2',

  // Soft Modern Status Colors
  statusDone: '#52796F',       // Warm Sage Green
  statusDoneBg: '#EDF4F2',
  statusInProgress: '#3D5A80', // Warm Dusty Blue
  statusInProgressBg: '#F0F4F8',
  statusOverdue: '#E63946',    // Warm Rose Coral
  statusOverdueBg: '#FDF0F0',
  statusPending: '#9A8C98',    // Soft Taupe Gray
  statusPendingBg: '#F4F2F5',
  statusWarning: '#E07A5F',    // Warm Terracotta
  statusWarningBg: '#FDF3EC',

  // Modern Typography
  textPrimary: '#2D2321',
  textSecondary: '#5A4E4B',
  textMuted: '#9E8E8A',
  border: '#F5E6DC',
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const SHADOWS = {
  small: {
    shadowColor: '#2D2321',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#2D2321',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#2D2321',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
};
