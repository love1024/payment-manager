import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { GetPaymentsDto, PaymentDto } from '@app/core/dto';
import { Observable, of, tap } from 'rxjs';
import { Cacheable } from 'typescript-cacheable';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private BASE_API_URL = 'http://34.69.128.141:8080';
  private http = inject(HttpClient);
  paymentCache = new Map<string, unknown>;

  constructor() {}

  savePayment(payment: PaymentDto): Observable<void> {
    return this.http.post<void>(`${this.BASE_API_URL}/payments`, payment);
  }

  getPayments(
    page = 1,
    per_page = 50,
    search = '',
    filter?: string
  ): Observable<GetPaymentsDto> {
    const key = `${page}-${per_page}-${search}-${filter}`
    const cache = this.paymentCache.get(key) as  GetPaymentsDto;
    if(cache) {
      return of(cache);
    }
    return this.http.get<GetPaymentsDto>(`${this.BASE_API_URL}/payments`, {
      params: {
        page,
        per_page,
        search,
        status: filter ?? '',
      },
    }).pipe(tap((res) => {
      this.paymentCache.set(key, res);
    }));
  }

  deletePayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_API_URL}/payments/${id}`);
  }

  updatePayment(id: string, payment: Partial<PaymentDto>): Observable<void> {
    return this.http.patch<void>(
      `${this.BASE_API_URL}/payments/${id}`,
      payment
    );
  }

  uploadEvidenceFile(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(
      `${this.BASE_API_URL}/payments/${id}/evidence`,
      formData
    );
  }

  downloadEvidenceFile(evidenceFileId: string): Observable<HttpResponse<Blob>> {
    const url = `${this.BASE_API_URL}/payments/evidence/${evidenceFileId}`;
    return this.http.get(url, { responseType: 'blob', observe: 'response' });
  }
}
