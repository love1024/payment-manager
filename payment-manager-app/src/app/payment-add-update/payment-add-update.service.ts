import { inject, Injectable } from '@angular/core';
import { CountryData, Payment } from '@app/core/models';
import {
  CountryService,
  EventService,
  PaymentService,
} from '@app/core/services';
import {
  AppEvent,
  NullableString,
  PayeePaymentStatus,
} from '@app/core/constants';
import { finalize, Observable } from 'rxjs';
import { PaymentDto } from '@app/core/dto';

@Injectable({ providedIn: 'root' })
export class PaymentAddUpdateService {
  private countryService = inject(CountryService);
  private paymentService = inject(PaymentService);
  private eventService = inject(EventService);

  getCountries(): Observable<CountryData[]> {
    return this.countryService.getCountries();
  }

  getStates(country: string): Observable<string[]> {
    return this.countryService.getStates(country);
  }

  getCities(country: string): Observable<string[]> {
    return this.countryService.getCities(country);
  }

  getStateCities(country: string, state: NullableString): Observable<string[]> {
    return this.countryService.getStateCities(country, state);
  }

  getCurrency(country: string): Observable<string> {
    return this.countryService.getCurrency(country);
  }

  savePayment(payment: Payment): Observable<void> {
    this.showProgressBar();
    const paymentDto: PaymentDto = {
      payee_first_name: payment.firstName,
      payee_last_name: payment.lastName,
      payee_payment_status: PayeePaymentStatus.PENDING, // Assuming a default status
      payee_added_date_utc: new Date().toISOString(),
      payee_due_date: payment.dueDate,
      payee_address_line_1: payment.address1,
      payee_address_line_2: payment.address2 || '',
      payee_city: payment.city,
      payee_country: payment.country,
      payee_province_or_state: payment.state || '',
      payee_postal_code: payment.postalCode,
      payee_phone_number: payment.phone,
      payee_email: payment.email,
      currency: payment.currency,
      discount_percent: parseFloat(payment.discountPct || '0') || 0,
      tax_percent: parseFloat(payment.taxPct || '0') || 0,
      due_amount: parseFloat(payment.dueAmount),
    };

    // Assuming there's a method in countryService to save the payment
    return this.paymentService
      .savePayment(paymentDto)
      .pipe(finalize(() => this.hideProgressBar()));
  }

  showProgressBar(): void {
    this.eventService.dispatchEvent(AppEvent.SHOW_PROGRESS_BAR);
  }

  hideProgressBar(): void {
    this.eventService.dispatchEvent(AppEvent.HIDE_PROGRESS_BAR);
  }
}
