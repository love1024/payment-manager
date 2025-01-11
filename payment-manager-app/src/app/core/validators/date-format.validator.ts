import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { format } from 'date-fns';

export function dateFormatValidator(): ValidatorFn {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    let value = control.value;
    if (value instanceof Date) {
      value = format(value, 'yyyy-MM-dd');
    }
    if (!value) return null; // Skip empty values

    return datePattern.test(value) ? null : { invalidDateFormat: true };
  };
}
