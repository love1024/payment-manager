import { NullableString } from '../constants';

export interface Payment {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: NullableString;
  country: string;
  state: NullableString;
  city: string;
  postalCode: string;
  currency: string;
  dueDate: string;
  dueAmount: string;
  discountPct?: string;
  taxPct?: string;
  paymentStatus: string;
  totalDue?: string;
  evidenceId?: string;
  addedDate?: string;
  address: string;
  fullName: string;
}

export interface PaymentInfo {
  _id?: string;
  email: string;
  phone: string;
  currency: string;
  dueDate: string;
  dueAmount: string;
  discountPct?: string;
  taxPct?: string;
  paymentStatus: string;
  totalDue?: string;
  evidenceId?: string;
  addedDate?: string;
  address: string;
  fullName: string;
}
