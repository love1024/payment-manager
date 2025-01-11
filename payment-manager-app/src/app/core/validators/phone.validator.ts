import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Skip empty values

    try {
      const phoneNumber = parsePhoneNumberFromString(value);
      return phoneNumber?.isValid() && phoneNumber.format('E.164') === value
        ? null
        : { invalidPhone: true };
    } catch {
      return { invalidPhone: true };
    }
  };
}
