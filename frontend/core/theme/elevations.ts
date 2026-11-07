import { colors } from './colors';

/** Existing shared-dialog elevation, centralized without changing its values. */
export const elevations = {
  dialog: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
};
