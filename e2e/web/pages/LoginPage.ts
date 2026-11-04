import { expect, type Page } from '@playwright/test';
import type { TestIdentity } from '../../shared/identities';

export class LoginPage {
  constructor(private readonly page: Page) {}
  email = () => this.page.getByTestId('login-email-input');
  password = () => this.page.getByTestId('login-password-input');
  submit = () => this.page.getByTestId('login-submit-button');

  async open() {
    await this.page.goto('/login', { waitUntil: 'load' });
    await expect(this.email()).toBeVisible({ timeout: 90_000 });
  }

  async signIn(identity: TestIdentity, password = identity.password) {
    await this.email().fill(identity.email);
    await this.password().fill(password);
    await this.submit().click();
  }

  async expectSignedIn() {
    await expect(this.page).not.toHaveURL(/\/login(\?|$)/, { timeout: 60_000 });
  }
}
