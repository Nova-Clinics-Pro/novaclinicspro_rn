import * as z from 'zod';

export type RegistrationFieldKey =
  | 'full_name'
  | 'email'
  | 'phone'
  | 'password'
  | 'confirmPassword'
  | 'tenant_name'
  | 'clinic_type'
  | 'address_line1'
  | 'city'
  | 'state'
  | 'postal_code';

export type RegistrationValidationCode =
  | 'field_required'
  | 'field_invalid'
  | 'form_invalid'
  | 'full_name_too_short'
  | 'contact_name_forbidden_term'
  | 'email_invalid'
  | 'temporary_email_not_allowed'
  | 'phone_invalid'
  | 'password_too_short'
  | 'passwords_do_not_match'
  | 'clinic_name_too_short'
  | 'clinic_name_forbidden_term'
  | 'clinic_type_invalid'
  | 'postal_code_invalid';

const message = (code: RegistrationValidationCode) => `errors.auth.registration.validation.${code}`;
const requiredText = () => z.string().trim().min(1, { message: message('field_required') });

export const isValidRegistrationPhone = (phone: string): boolean => {
  const normalized = phone.replace(/[- ()]/g, '');
  if (normalized.startsWith('+91')) return normalized.length === 13 && /^\+91\d{10}$/.test(normalized);
  if (normalized.startsWith('91')) return normalized.length === 12 && /^91\d{10}$/.test(normalized);
  return /^\d{10}$/.test(normalized);
};

export const registrationFormSchema = z
  .object({
    full_name: requiredText().min(2, { message: message('full_name_too_short') }).max(255, { message: message('field_invalid') }).refine(
      value => !value.toLowerCase().includes('test'),
      { message: message('contact_name_forbidden_term') }
    ),
    email: requiredText().email({ message: message('email_invalid') }),
    phone: requiredText().refine(isValidRegistrationPhone, { message: message('phone_invalid') }),
    password: requiredText().min(8, { message: message('password_too_short') }),
    confirmPassword: requiredText(),
    tenant_name: requiredText().min(2, { message: message('clinic_name_too_short') }).max(255, { message: message('field_invalid') }).refine(
      value => !value.toLowerCase().includes('test'),
      { message: message('clinic_name_forbidden_term') }
    ),
    clinic_type: requiredText(),
    address_line1: requiredText().min(2, { message: message('field_invalid') }),
    city: requiredText().min(2, { message: message('field_invalid') }),
    state: requiredText().min(2, { message: message('field_invalid') }),
    postal_code: requiredText().refine(value => /^\d{6}$/.test(value), {
      message: message('postal_code_invalid'),
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: message('passwords_do_not_match'),
    path: ['confirmPassword'],
  });

export type RegistrationFormData = z.infer<typeof registrationFormSchema>;

export const registrationFieldStep: Readonly<Record<RegistrationFieldKey, number>> = {
  full_name: 0,
  email: 0,
  phone: 0,
  password: 0,
  confirmPassword: 0,
  tenant_name: 1,
  clinic_type: 1,
  address_line1: 2,
  city: 2,
  state: 2,
  postal_code: 2,
};

export const isRegistrationFieldKey = (value: string | null | undefined): value is RegistrationFieldKey =>
  value !== undefined && value !== null && Object.prototype.hasOwnProperty.call(registrationFieldStep, value);
