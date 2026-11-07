import { expect, type Page } from '@playwright/test';
import type { TestIdentity } from '../../shared/identities';

/** Three-step clinic-owner registration: Personal Info -> Clinic Details -> Address. */
export class RegisterPage {
  constructor(private readonly page: Page) {}
  next = () => this.page.getByText('Next', { exact: true });
  submit = () => this.page.getByText('Submit Registration', { exact: true });

  async open() {
    await this.page.goto('/register', { waitUntil: 'load' });
    await expect(this.page.getByPlaceholder('Enter your full name')).toBeVisible({ timeout: 90_000 });
  }

  async fillPersonal(i: TestIdentity, confirm = i.password) {
    await this.page.getByPlaceholder('Enter your full name').fill(i.fullName);
    await this.page.getByPlaceholder('your.email@example.com').fill(i.email);
    await this.page.getByPlaceholder('+91 1234567890').fill(i.phone);
    await this.page.getByPlaceholder('Minimum 8 characters').fill(i.password);
    await this.page.getByPlaceholder('Re-enter password').fill(confirm);
  }

  async fillClinic(i: TestIdentity) {
    await this.page.getByPlaceholder('Your Clinic Name').fill(i.clinicName);
    const label = i.clinicType === 'ayurveda' ? 'Ayurveda' : 'General';
    await this.page.getByText(label, { exact: true }).click();
  }

  async fillAddress(i: TestIdentity) {
    await this.page.getByPlaceholder('Street address').fill(i.address.street);
    await this.page.getByPlaceholder('City').fill(i.address.city);
    await this.page.getByPlaceholder('State').fill(i.address.state);
    await this.page.getByPlaceholder('PIN').fill(i.address.pin);
  }

  /** Completes all three steps and submits. */
  async register(i: TestIdentity) {
    await this.fillPersonal(i);
    await this.next().click();
    await this.fillClinic(i);
    await this.next().click();
    await this.fillAddress(i);
    await this.submit().click();
  }
}
