const theme = {
  colors: {
    primary: {
      default: '#2563EB',
      main: '#2563EB',
      onPrimary: '#FFFFFF',
      soft: '#EFF6FF',
    },
    secondary: { default: '#7C3AED', onSecondary: '#FFFFFF' },
    background: { default: '#F9FAFB', elevated: '#FFFFFF', muted: '#F3F4F6' },
    surface: { default: '#FFFFFF', elevated: '#FFFFFF', muted: '#F9FAFB' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', focus: '#2563EB' },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      link: '#2563EB',
      onPrimary: '#FFFFFF',
    },
    feedback: {
      success: '#10B981',
      successLight: '#ECFDF5',
      warning: '#F59E0B',
      warningLight: '#FFFBEB',
      error: '#EF4444',
      errorLight: '#FEF2F2',
      info: '#3B82F6',
      infoLight: '#EFF6FF',
    },
    common: { white: '#FFFFFF' },
    grey: { 50: '#F9FAFB', 400: '#9CA3AF' },
    success: { main: '#10B981' },
    info: { main: '#3B82F6' },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  typography: {
    h5: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    h6: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
    subtitle1: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
    subtitle2: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    button: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  },
};

(global as any).__DEV__ = true;

jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  const Platform = { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default };

  return {
    ActivityIndicator: host('ActivityIndicator'),
    Alert: { alert: jest.fn() },
    FlatList: host('FlatList'),
    Keyboard: { dismiss: jest.fn() },
    KeyboardAvoidingView: host('KeyboardAvoidingView'),
    Modal: host('Modal'),
    Platform,
    Pressable: host('Pressable'),
    RefreshControl: host('RefreshControl'),
    ScrollView: host('ScrollView'),
    StyleSheet: {
      absoluteFillObject: {},
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    Switch: host('Switch'),
    Text: host('Text'),
    TextInput: host('TextInput'),
    TouchableOpacity: host('TouchableOpacity'),
    View: host('View'),
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  };
});

// RN 0.86 moved this helper from Libraries/Animated to src/private/animated.
// Do not retain a mock for the removed legacy path: the RN Jest resolver maps
// react-native subpaths to node_modules and rejects the non-existent module
// before the virtual mock can apply.
jest.mock('react-native/Libraries/Animated/NativeAnimatedModule', () => ({}), { virtual: true });
jest.mock('react-native/Libraries/Animated/shouldUseTurboAnimatedModule', () => () => false);
jest.mock('react-native/src/private/animated/NativeAnimatedHelper', () => ({}));
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: (values: Record<string, unknown>) => values.ios ?? values.default,
}));
jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => {
  const React = require('react');
  return (props: any) => React.createElement('TouchableOpacity', props, props.children);
});
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: jest.fn(() => Promise.resolve()),
      setQueryData: jest.fn(),
    }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return { SafeAreaView: (props: any) => React.createElement('SafeAreaView', props, props.children) };
});
jest.mock('../../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => theme }));
jest.mock('../../../core/localization/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

global.console = { ...console, warn: jest.fn(), error: jest.fn(), log: jest.fn() };
