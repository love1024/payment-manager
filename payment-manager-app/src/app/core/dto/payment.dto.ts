import { PayeePaymentStatus } from '../constants';

export interface PaymentDto {
  _id?: string;
  payee_first_name: string;
  payee_last_name: string;
  payee_payment_status: PayeePaymentStatus;
  payee_added_date_utc: string;
  payee_due_date: string;
  payee_address_line_1: string;
  payee_address_line_2?: string;
  payee_city: string;
  payee_country: string; // ISO 3166-1 alpha-2
  payee_province_or_state?: string;
  payee_postal_code: string;
  payee_phone_number: string; // E.164 format
  payee_email: string;
  currency: string; // ISO 4217
  discount_percent?: number; // Percentage
  tax_percent?: number; // Percentage
  due_amount: number; // Mandatory, 2 decimal points
  total_due?: number;
  evidence_file_id?: string;
}

export interface Metadata {
  page: number;
  per_page: number;
  page_count: number;
  total_count: number;
  links: {
    self: string;
    first: string;
    previous: string;
    next: string;
    last: string;
  }[];
}

export interface GetPaymentsDto {
  metadata: Metadata;
  payments: PaymentDto[];
}
