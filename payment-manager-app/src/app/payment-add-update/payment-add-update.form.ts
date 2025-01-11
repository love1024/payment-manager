import { FormControl } from '@angular/forms';
import { NullableString } from '@app/core/constants';

export interface PaymentForm {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  address1: FormControl<string>;
  address2: FormControl<NullableString>;
  country: FormControl<string>;
  state: FormControl<NullableString>;
  city: FormControl<string>;
  postalCode: FormControl<string>;
  currency: FormControl<string>;
  dueDate: FormControl<string>;
  dueAmount: FormControl<string>;
  discountPct: FormControl<string>;
  taxPct: FormControl<string>;
}

export const paymentFormErors: Record<string, string> = {
  required: 'This field is required',
  email: 'Email address is invalid',
  selection: 'Allowed selection is not valid',
  maxlength: 'Exceeded maximum length allowed',
  invalidPhone: 'Phone number is invalid',
  invalidDateFormat: 'Date is required in YYYY-MM-DD format',
  max: 'Exceeded max value',
};
