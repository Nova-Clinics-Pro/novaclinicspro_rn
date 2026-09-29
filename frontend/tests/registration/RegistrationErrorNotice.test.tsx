import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { RegistrationSubmissionError } from '../../features/registration/data/datasources/registration.api';
import { RegistrationErrorNotice } from '../../features/registration/presentation/components/RegistrationErrorNotice';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { post: jest.fn() },
}));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      feedback: { error: '#a00', errorLight: '#fee' },
      primary: { default: '#060' },
    },
    spacing: { sm: 8, md: 16, lg: 24 },
    typography: { body2: { fontSize: 14 }, button: { fontSize: 16 } },
  }),
}));

describe('RegistrationErrorNotice', () => {
  it('keeps a known existing-account conflict in feature UI with Sign In recovery', () => {
    const onSignIn = jest.fn();
    const { getByRole, getByText, queryByText } = render(
      <RegistrationErrorNotice
        error={new RegistrationSubmissionError('USER_ALREADY_EXISTS', 409, 'user_already_exists')}
        onSignIn={onSignIn}
      />
    );

    expect(getByRole('alert')).toBeTruthy();
    expect(getByText('errors.auth.registration.USER_ALREADY_EXISTS')).toBeTruthy();
    expect(queryByText('user_already_exists')).toBeNull();
    expect(queryByText('409')).toBeNull();
    fireEvent.press(getByRole('button', { name: 'errors.auth.registration.signIn' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it.each(['INVALID_CREDENTIALS', 'TOO_MANY_ATTEMPTS'] as const)(
    'presents %s as a recoverable feature error without Sign In conflict recovery',
    (kind) => {
      const { getByRole, getByText, queryByRole } = render(
        <RegistrationErrorNotice error={new RegistrationSubmissionError(kind)} onSignIn={jest.fn()} />
      );

      expect(getByRole('alert')).toBeTruthy();
      expect(getByText(`errors.auth.registration.${kind}`)).toBeTruthy();
      expect(queryByRole('button', { name: 'errors.auth.registration.signIn' })).toBeNull();
    }
  );
});
