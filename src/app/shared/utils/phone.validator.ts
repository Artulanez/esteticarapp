import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '').toString().trim();

  if (!value) {
    return null;
  }

  const digits = value.replace(/[\D]/g, '');

  if (!/^\d{10,11}$/.test(digits)) {
    return { pattern: true };
  }

  return null;
};
