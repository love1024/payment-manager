import { FormControl } from '@angular/forms';
import { NullableString } from '@app/core/constants';

export interface PaymentUpdateForm {
  dueDate: FormControl<string>;
  dueAmount: FormControl<string>;
  status: FormControl<string>;
  evidenceId: FormControl<NullableString>;
}

export const paymentUpdateFormErors: Record<string, string> = {
  required: 'This field is required',
  futureDate: 'Due date must be in the future for pending status',
  pastDate: 'Due date must be in the past for overdue status',
  now: 'Due date must be today for due now status',
  evidence: 'Please upload evidence file to mark as completed.',
};
