import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AppEvent, PayeePaymentStatus } from '@app/core/constants';
import { GetPaymentsDto, PaymentDto } from '@app/core/dto';
import { Payment, PaymentInfo } from '@app/core/models';
import { EventService, PaymentService } from '@app/core/services';
import { finalize, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private paymentService = inject(PaymentService);
  private eventService = inject(EventService);

  getPayments(
    page: number,
    per_page: number,
    filter: string,
    status: string
  ): Observable<GetPaymentsDto> {
    this.showProgressBar();
    return this.paymentService
      .getPayments(page, per_page, filter, status)
      .pipe(finalize(() => this.hideProgressBar()));
  }

  deletePayment(id: string): Observable<void> {
    this.showProgressBar();
    return this.paymentService
      .deletePayment(id)
      .pipe(finalize(() => this.hideProgressBar()));
  }

  updatePayment(id: string, payment: Partial<Payment>): Observable<void> {
    const paymentDto: Partial<PaymentDto> = {
      payee_due_date: payment.dueDate,
      due_amount: payment.dueAmount ? +payment.dueAmount : 0,
      payee_payment_status: <PayeePaymentStatus>payment.paymentStatus,
    };
    this.showProgressBar();
    return this.paymentService
      .updatePayment(id, paymentDto)
      .pipe(finalize(() => this.hideProgressBar()));
  }

  uploadEvidenceFile(id: string, file: File): Observable<void> {
    this.showProgressBar();
    return this.paymentService
      .uploadEvidenceFile(id, file)
      .pipe(finalize(() => this.hideProgressBar()));
  }

  // Method to download file using evidence_file_id
  downloadEvidenceFile(evidenceFileId: string): void {
    this.paymentService.downloadEvidenceFile(evidenceFileId).subscribe(
      (response: HttpResponse<Blob>) => {
        // Retrieve the file blob from the response body
        const fileBlob = response.body;
        if (!fileBlob) {
          return;
        }
        // Get the file name from the response headers
        const contentDisposition = response.headers.get('Content-Disposition');
        const fileName = this.extractFileName(contentDisposition);

        // Create a URL for the blob and trigger a download
        const downloadUrl = window.URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName; // You can set the file name here
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
      },
      error => {
        console.error('File download failed:', error);
      }
    );
  }

  toPayment(payments: PaymentDto[]): PaymentInfo[] {
    return payments.map(payment => {
      const model: PaymentInfo = {
        _id: payment._id,
        fullName: `${payment.payee_first_name} ${payment.payee_last_name}`,
        email: payment.payee_email,
        phone: payment.payee_phone_number,
        currency: payment.currency,
        dueDate: payment.payee_due_date,
        dueAmount: payment.due_amount.toFixed(2),
        discountPct: payment.discount_percent?.toFixed(2),
        taxPct: payment.tax_percent?.toFixed(2),
        paymentStatus: payment.payee_payment_status || null,
        totalDue: (payment.total_due ?? 0).toString(),
        evidenceId: payment.evidence_file_id,
        addedDate: payment.payee_added_date_utc,
        address: this.createFormattedAddress(payment),
      };
      return model;
    });
  }

  private extractFileName(contentDisposition: string | null): string {
    if (!contentDisposition) return 'downloaded-file';

    const matches = /filename="(.+)"/.exec(contentDisposition);
    return matches && matches[1] ? matches[1] : 'downloaded-file';
  }

  private createFormattedAddress(paymentDto: PaymentDto): string {
    const addressParts = [
      paymentDto.payee_address_line_1,
      paymentDto.payee_address_line_2,
      paymentDto.payee_city,
      paymentDto.payee_postal_code,
      paymentDto.payee_province_or_state,
      paymentDto.payee_country,
    ];
    return addressParts.filter(part => part).join(', ');
  }

  private showProgressBar(): void {
    this.eventService.dispatchEvent(AppEvent.SHOW_PROGRESS_BAR);
  }

  private hideProgressBar(): void {
    this.eventService.dispatchEvent(AppEvent.HIDE_PROGRESS_BAR);
  }
}
