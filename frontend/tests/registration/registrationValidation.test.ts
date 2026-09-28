import { registrationFormSchema } from '../../features/registration/domain/registrationValidation';

const validForm = {
  full_name: 'Clinic Owner',
  email: 'owner@clinic.in',
  phone: '9000000000',
  password: 'registration-password',
  confirmPassword: 'registration-password',
  tenant_name: 'Wellness Clinic',
  clinic_type: 'ayurveda',
  address_line1: '1 Main Street',
  city: 'Hyderabad',
  state: 'Telangana',
  postal_code: '500001',
};

describe('registrationFormSchema', () => {
  it('accepts a valid deterministic registration payload', () => {
    expect(registrationFormSchema.safeParse(validForm).success).toBe(true);
  });

  it('rejects known deterministic field errors before submission', () => {
    const result = registrationFormSchema.safeParse({
      ...validForm,
      full_name: 'test',
      phone: '123',
      postal_code: '1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors;
      expect(issues.full_name).toContain('errors.auth.registration.validation.contact_name_forbidden_term');
      expect(issues.phone).toContain('errors.auth.registration.validation.phone_invalid');
      expect(issues.postal_code).toContain('errors.auth.registration.validation.postal_code_invalid');
    }
  });

  it('revalidates corrected values successfully', () => {
    const invalid = registrationFormSchema.safeParse({ ...validForm, phone: '123' });
    const corrected = registrationFormSchema.safeParse(validForm);

    expect(invalid.success).toBe(false);
    expect(corrected.success).toBe(true);
  });
});
