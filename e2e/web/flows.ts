import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import type { TestIdentity } from '../shared/identities';

/** Reusable workflow: sign in through the real login screen. */
export async function signInThroughUi(page: Page, identity: TestIdentity) {
  const login = new LoginPage(page);
  await login.open();
  await login.signIn(identity);
  await login.expectSignedIn();
  return login;
}

/** The application's own logout route (app/logout.tsx). No visible logout control exists in the onboarding state. */
export async function logoutThroughRoute(page: Page) {
  await page.goto('/logout', { waitUntil: 'load' });
}
