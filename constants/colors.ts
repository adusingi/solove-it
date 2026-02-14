const Colors = {
  primary: '#E86A50',
  primaryLight: '#FFF0EC',
  primaryDark: '#C4533E',
  secondary: '#F5A623',
  secondaryLight: '#FFF5E0',
  accent: '#4ECDC4',
  accentLight: '#E8FAF8',

  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',

  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#F0EDED',
  borderLight: '#F7F5F5',
  divider: '#F3F0F0',

  success: '#34D399',
  successLight: '#ECFDF5',
  warning: '#FBBF24',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',

  categoryColors: {
    anniversary: '#E86A50',
    date: '#F472B6',
    experience: '#8B5CF6',
    health: '#34D399',
    beauty: '#EC4899',
    hobby: '#F59E0B',
    home: '#6366F1',
    money: '#10B981',
    family: '#F97316',
    social: '#06B6D4',
  } as Record<string, string>,

  priorityColors: {
    high: '#EF4444',
    mid: '#F59E0B',
    low: '#9CA3AF',
  } as Record<string, string>,

  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};

export default Colors;
